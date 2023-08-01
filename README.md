# @mock/serve

Local server for @mock applications.


## Config

| Property | Description |
| -------- | ----------- |
| port     | Server port. |
| index    | File to serve when a route was not found. Supports http and ./ |
| route     | Routing paths. |
| verbose  | | Outputs all files served on console |



## API Routing Path Definitions

```json
{
  "/": {
    "target": "./public"
  },
  "/api": { 
    "api": true,
    "target": "./public/api"
  },
  "/api/test": {
    "target": "./public/test.json",
  },
  "/api/test2": {
    "methods": ["post"],
    "target": "./public/test.json",
  },
  "/api/google": {
    "proxy": true,
    "target": "https://www.google.com",
    "options": { 
      "pathRewrite": { "^/api/google" : "/" }
    }
  }
}
```

| Property | Values     | Description |
| -------- | ---------- | ----------- |
| methods  | get post   | Restricts the request method used. |
| api      | false true | Mock API routes. |
| target   |            | Url or file path to the assets.|
| proxy    | false true | Creates a proxy route. |


## Shortcuts

| Shortcut String | Description | 
| --- | --- |
| {src} | Returns the {src} file. |
| get:{src} | Returns the {src} file for get calls only. |
| post:{src} | Returns the {src} file for post calls only. |
| get post:{src} | Returns the {src} file for get and post calls only. |
| api:{src} | Uses {src} files as mock API. |
| proxy:{src} | Creates a proxy that forwards to {src}. |

```json
{
  "/": "./public",
  "/static": "./public/static",
  "/api": "api:./public/api",
  "/api/not-test": "api:./public/api/test.json",
  "/api/post": "api post:./public/api/test.json",
  "/api/google": "proxy:https://www.google.com"
}
```

