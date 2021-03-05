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
    AUTH_SECRET=abcd1234abcd1234abcd
    ADMIN_API_KEY=abcd-1234abcd-1234abcd
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
- For admin endpoints use `ADMIN_API_KEY` fetched from `.env` config

- The apikey can be passed to the PiBIZ API in two ways
    - In a query parameter.   
        ```js
        fetch('/api/asset/h435gr/?apikey=xxkeyxx')
        ```

    - As an `apikey` header.
        ```js
        fetch('/api/asset/h435gr', {
            headers: { 'apikey': 'xxkeyxx' }
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

- `GET Asset` ::  Get Asset File   
        
    ```js
    fetch('/api/asset/{assetId}', {
        method: 'GET'             
    })   
    ```


#
    
ADMIN API Endpoints
----------

- `Admin Login` ::  Authenticate & Returns Auth Token   
        
    ```js
    fetch('/api/admin/login', {
        method: 'post',       
        body: JSON.stringify({
            username: 'admin_username',
            password: 'admin_password'
        })
    })   
    ```

- `Admin Exec` :: Executes various admin actions & Returns result 
        
     ```js
    fetch('/api/admin/exec/{action}', {
        method: 'post',       
        body: JSON.stringify({...})
    })   
    ```

    ```js
    fetch('/api/admin/exec/getFields', {
        method: 'post',       
        body: JSON.stringify({
            identity: 'collectionName'
        })
    })   
    ```

    ```js
    fetch('/api/admin/exec/getAccessGroups', {
        method: 'post'    
    })   
    ```
     
    ```js
    fetch('/api/admin/exec/getAccountGroups', {
        method: 'post'    
    })   
    ```

    ```js
    fetch('/api/admin/exec/findEntries', {
        method: 'post',
        body: JSON.stringify({
            identity: 'collectionName',
            query: { status: 'on' },
            limit: 50,
            offset: 0,
            pick: [ 'field1', 'field6' ]
        })    
    })   
    ```


    ```js
    fetch('/api/admin/exec/findEntry', {
        method: 'post',
        body: JSON.stringify({
            identity: 'collectionName',
            query: { _id: 'uid1' },           
            omit: [ 'field3' ]
        })    
    })   
    ```

- `Admin Asset` ::  Get Asset File   
        
    ```js
    fetch('/api/admin/asset/{assetId}', {
        method: 'GET'             
    })   
    ```
