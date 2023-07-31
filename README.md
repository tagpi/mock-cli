# @mock/serve

Local server for @mock applications.


## Config

| Property | Description |
| -------- | ----------- |
| port     | Server port. |
| reload   | Reloads the config every request. |
| index    | File to serve when a route was not found. |
| path     | Routing paths. |


## API Routing Path Definitions

```json
{
  "/api": { 
    "src": "./sample",
    "dir": true
  },
  "/api/test": {
    "src": "./sample/test.json",
  },
  "/api/test2": {
    "method": "POST",
    "src": "./sample/test.json",
  },
  "/api/proxy": {
    "type": "proxy",
    "src": "https://www.google.com",
    "options": { 
      "pathRewrite": { "^/api/proxy" : "/" }
    }
  }
}
```

| Property | Values | Description |
| -------- | ------- | ----------- |
| method   | get post | Restricts the request method used. |
| type     | api proxy static | Data format to return. |
| src      | | Local relative path to the assets. <br> Proxy path for proxies.|
| dir      | false true | Maps based on the folder path. |
| verbose  | | Outputs all files served on console |



## Shortcuts

| Shortcut String | Description | 
| --- | --- |
| {src} | returns the {src} file based on the file extension. |
| get:{src} | returns the {src} file for get calls only. |
| post:{src} | returns the {src} file for post calls only. |
| dir:{src} | uses the API path as the directory path to the file. |
| proxy:{src} | creates a proxy that forwards to {src}. |

```json
{
  "/api": "dir:./sample",
  "/api/test": "./sample/test.json",
  "/api/post": "post:./sample/test.json"
}
```