
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const Helper = require('../Utils/helper');

class LokiFsStructuredAdapter {
    constructor() {
        this.mode = "reference";
        this.dbref = null;
        this.dirtyPartitions = [];
        this.cKey = Helper.GetCKey();
        this.sodium = null;
    }

    encrypt = async (message) => {
        if (!this.sodium) this.sodium = await Helper.GetSodium();

        let nonce = await this.sodium.randombytes_buf(24);
        let ciphertext = await this.sodium.crypto_secretbox(message, nonce, this.cKey);

        let n = await this.sodium.sodium_bin2hex(nonce);
        let c = await this.sodium.sodium_bin2hex(ciphertext);
        return `${n}:${c}`;
    }

    decrypt = async (ciphertext) => {
        if (!this.sodium) this.sodium = await Helper.GetSodium();

        let textParts = ciphertext.split(':');
        let nonce = await this.sodium.sodium_hex2bin(textParts.shift());
        let encryptedText = await this.sodium.sodium_hex2bin(textParts.join(':'));

        let decrypted = await this.sodium.crypto_secretbox_open(encryptedText, nonce, this.cKey);
        return decrypted.toString('utf8');
    }

    *generateDestructured(options) {
        let idx, sidx;
        let dbcopy;

        options = options || {};

        if (!options.hasOwnProperty("partition")) {
            options.partition = -1;
        }

        // if partition is -1 we will return database container with no data
        if (options.partition === -1) {
            // instantiate lightweight clone and remove its collection data
            dbcopy = this.dbref.copy();

            for (idx = 0; idx < dbcopy.collections.length; idx++) {
                dbcopy.collections[idx].data = [];
            }

            yield dbcopy.serialize({
                serializationMethod: "normal"
            });

            return;
        }

        // 'partitioned' along with 'partition' of 0 or greater is a request for single collection serialization
        if (options.partition >= 0) {
            let doccount, docidx;

            // dbref collections have all data so work against that
            let doccountData = this.dbref.collections[options.partition].data;
            doccount = doccountData.length;

            for (docidx = 0; docidx < doccount; docidx++) {
                yield JSON.stringify(doccountData[docidx]);
            }

        }
    }


    /**
     * Loki persistence adapter interface function which outputs un - prototype db object reference to load from.
     *
     * @param { string } dbname - the name of the database to retrieve.
     * @param { function} callback - callback should accept string param containing db object reference.
     * @memberof LokiFsStructuredAdapter
    */

    loadDatabase = (dbname, callback) => {
        let instream,
            outstream,
            rl;

        this.dbref = null;

        // make sure file exists
        fs.stat(dbname, (fileErr, stats) => {
            let jsonErr;

            if (fileErr) {
                if (fileErr.code === "ENOENT") {
                    // file does not exist, so callback with null
                    callback(null);
                    return;
                } else {
                    // some other file system error.
                    callback(fileErr);
                    return;
                }
            } else if (!stats.isFile()) {
                // something exists at this path but it isn't a file.
                callback(new Error(dbname + " is not a valid file."));
                return;
            }

            instream = fs.createReadStream(dbname);
            outstream = new stream();
            rl = readline.createInterface(instream, outstream);

            // first, load db container component
            rl.on('line', (line) => {
                // it should single JSON object (a one line file)
                if (this.dbref === null && line !== "") {
                    try {
                        this.dbref = JSON.parse(line);
                    } catch (e) {
                        jsonErr = e;
                    }
                }
            });

            // when that is done, examine its collection array to sequence loading each
            rl.on('close', () => {
                if (jsonErr) {
                    // a json error was encountered reading the container file.
                    callback(jsonErr);
                } else if (this.dbref.collections.length > 0) {
                    this.loadNextCollection(dbname, 0, () => {
                        callback(this.dbref);
                    });
                }
            });
        });
    }

    /**
    * Recursive function to chain loading of each collection one at a time. 
    * If at some point i can determine how to make async driven generator, this may be converted to generator.
    *
    * @param {string} dbname - the name to give the serialized database within the catalog.
    * @param {int} collectionIndex - the ordinal position of the collection to load.
    * @param {function} callback - callback to pass to next invocation or to call when done
    * @memberof LokiFsStructuredAdapter
    */
    loadNextCollection = (dbname, collectionIndex, callback) => {
        let instream = fs.createReadStream(dbname + "." + collectionIndex);
        let outstream = new stream();
        let rl = readline.createInterface(instream, outstream);
        let obj;

        rl.on('line', (line) => {
            const self = this;
            (async function () {
                if (line !== "") {
                    try {
                        let ln = await self.decrypt(line);
                        obj = JSON.parse(ln);
                    } catch (e) {
                        callback(e);
                    }
                    self.dbref.collections[collectionIndex].data.push(obj);
                }
            })();
        });

        rl.on('close', (line) => {
            instream = null;
            outstream = null;
            rl = null;
            obj = null;

            // if there are more collections, load the next one
            if (++collectionIndex < this.dbref.collections.length) {
                this.loadNextCollection(dbname, collectionIndex, callback);
            }
            // otherwise we are done, callback to loadDatabase so it can return the new db object representation.
            else {
                callback();
            }
        });
    }

    /**
     * Generator for yielding sequence of dirty partition indices to iterate.
     *
     * @memberof LokiFsStructuredAdapter
     */
    *getPartition() {
        let idx;
        let clen = this.dbref.collections.length;

        // since database container (partition -1) doesn't have dirty flag at db level, always save
        yield -1;

        // yield list of dirty partitions for iterateration
        for (idx = 0; idx < clen; idx++) {
            if (this.dbref.collections[idx].dirty) {
                yield idx;
            }
        }
    }

    /**
     * Loki reference adapter interface function.  Saves structured json via loki database object reference.
     *
     * @param {string} dbname - the name to give the serialized database within the catalog.
     * @param {object} dbref - the loki database object reference to save.
     * @param {function} callback - callback passed obj.success with true or false
     * @memberof LokiFsStructuredAdapter
     */
    exportDatabase = (dbname, dbref, callback) => {
        let idx;

        this.dbref = dbref;

        // create (dirty) partition generator/iterator
        let pi = this.getPartition();

        this.saveNextPartition(dbname, pi, () => {
            callback(null);
        });
    }

    /**
     * Utility method for queueing one save at a time
     */
    saveNextPartition = (dbname, pi, callback) => {
        let li;
        let filename;
        let pinext = pi.next();

        const self = this;

        if (pinext.done) {
            callback();
            return;
        }


        let shudEnc = true;
        if (pinext.value === -1) {
            shudEnc = false;
        }

        // db container (partition -1) uses just dbname for filename,
        // otherwise append collection array index to filename
        filename = dbname + ((pinext.value === -1) ? "" : ("." + pinext.value));

        let wstream = fs.createWriteStream(filename);

        wstream.on('close', () => {
            this.saveNextPartition(dbname, pi, callback);
        });

        li = this.generateDestructured({ partition: pinext.value });

        if (shudEnc) {
            (async function () {
                for (var outline of li) {
                    let ln = await self.encrypt(outline);
                    wstream.write(ln + "\n");
                }
                wstream.end();
            })();
        } else {
            // iterate each of the lines generated by generateDestructured()
            for (let outline of li) {
                wstream.write(outline + "\n");
            }

            wstream.end();
        }
    }

}

module.exports = LokiFsStructuredAdapter;