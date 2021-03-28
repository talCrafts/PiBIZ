# PiBIZ
Headless &amp; Api First Content Platform

Quickstart
----------

1. In a terminal, run:

   ```bash
   git clone https://github.com/ApptitudeInfotech/PiBIZ.git
   cd PiBIZ
   npm install
   ```

1. Create and Modify your `.env` file and edit the followings

    ```bash
    APP_HOST=127.0.0.1
    APP_PORT=1760
    AUTH_SECRET=x32
    ADMIN_API_KEY=x24
    DB_ENC_KEY=x32
    ```

1. In a terminal, run:

   ```bash
   npm start
   ```

1. API Server ready at [http://localhost:1760/api](http://localhost:1760/api)

#

API Key
----------

- Before consuming your api data you need to create an apikey. 
- You can revoke existing or create new apikey anytime you want.
- Each apikey has a scope rule ( Unless Master Mode is  `ON` )  which specify which API Collections the apikey is valid for. 
- Apikey with Master Mode `ON` has full API access.
- For admin accounts use `ADMIN_API_KEY` fetched from `.env` config

- Apikey can be passed to the PiBIZ API in two ways
    - In a query parameter as `apikey`.   
        ```js
        fetch('/api/asset/h435gr/?apikey=KEY')
        ```

    - As an `apikey` header.
        ```js
        fetch('/api/asset/h435gr', {
            headers: { 'apikey': 'KEY' }
        })
        ```

#

AUTH Token
----------

- Authorized api endpoints requires JWT AuthToken. 
- AuthToken for Admin Group has full access.
- For Signing JWT Tokens use `AUTH_SECRET` fetched from `.env` config

- AuthToken can be passed to the PiBIZ API in two ways
    - In a query parameter as `authtoken`.   
        ```js
        fetch('/api/asset/h435gr/?apikey=KEY&authtoken=TOKEN')
        ```

    - As an `Authorization` Bearer header.
        ```js
        fetch('/api/exec/{collection}/{action}', {
            method: 'post',       
            body: JSON.stringify({...}),
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        })   
        ```        
    

#

API Endpoints
----------

- `POST Login` ::  Authenticate & Returns Auth Token   
        
    ```js
    fetch('/api/login', {
        method: 'post',       
        body: JSON.stringify({
            username: 'username',
            password: 'password'
        })
    })   
    ```

- `POST Exec` :: Executes actions `find`, `findOne`, `create`, `update`, `remove` and `count`
        
     ```js
    fetch('/api/exec/{collection}/{action}', {
        method: 'post',       
        body: JSON.stringify({...})
    })   
    ```

    ```js
    fetch('/api/exec/accounts/find', {
        method: 'post',
        body: JSON.stringify({            
            query: { status: 'on' },
            limit: 50,
            offset: 0,
            omit: [ 'password' ]
        })    
    })   
    ```


    ```js
    fetch('/api/exec/accounts/findOne', {
        method: 'post',
        body: JSON.stringify({           
            query: { _id: 'uid1' },           
            pick: [ 'displayName', 'group' ]
        })    
    })   
    ```


    ```js
    fetch('/api/exec/pibiz/getFieldTypes', {
        method: 'post'        
    })   
    ```

    ```js
    fetch('/api/exec/pibiz/getFields', {
        method: 'post',
        body: JSON.stringify({           
            identity: 'collection'           
        })    
    })   
    ```

    ```js
    fetch('/api/exec/pibiz/getAccessGroups', {
        method: 'post'        
    })   
    ```

    ```js
    fetch('/api/exec/pibiz/getFormView', {
        method: 'post',
        body: JSON.stringify({           
            identity: 'collection',
            _id:'optional _id'           
        })    
    })   
    ```


- `GET Asset` ::  Get Asset File   
        
    ```js
    fetch('/api/asset/{assetId}', {
        method: 'GET'             
    })   
    ```