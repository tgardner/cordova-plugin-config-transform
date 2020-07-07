# Cordova Config Transformation Plugin

This plugin allows you to transform your Cordova config.xml file using a JSON data file.

## Installation 
With Cordova CLI, from npm:
```
cordova plugin add cordova-plugin-config-transform
```

## Usage

1. Create an override mapping file

2. Build your project like `cordova build --config=path/to/mapping/file.json`

## Syntax

Your mapping file is relative to your `<widget />` element in your config.xml file.

### Attributes
Define properties starting with @ to set attribute values. e.g
```json
{
    "@id": "io.helloworld.cordovadev"
}
```
will update the `<widget id="" />` attribute to io.helloworld.cordovadev

### String Values
To update a nodes inner text like `<name>App Name</name>` 
Specify a string value 
```json
{
    "name": "Hello World DEV"
}
```

or use the special object property `_` to match the current node.
```json
{
    "author": {
        "@email": "trent@somedomain.com",
        "@href": "http://somedomain.com",
        "_": "Trent Gardner"
    }
}
```

### Filtering
You can filter arrays using node attributes using `[attribute=value]` syntax.

```json
{
    "plugin[name=cordova-plugin-facebook4]": {
        "variable[name=APP_ID]": {
            "@value": "MY_FACEBOOK_APP_ID"
        },
        "variable[name=APP_NAME]": {
            "@value": "MY_FACEBOOK_APP_NAME"
        }
    }
}
```
Will only match the plugin cordova-plugin-facebook4 and update the variable values.

## Example
```json
{
    "@id": "io.helloworld.cordovadev",
    "name": "Hello World DEV",
    "description": "Hello World",
    "author": {
        "@email": "trent@somedomain.com",
        "@href": "http://somedomain.com",
        "_": "Trent Gardner"
    },
    "plugin[name=cordova-plugin-facebook4]": {
        "variable[name=APP_ID]": {
            "@value": "MY_FACEBOOK_APP_ID"
        },
        "variable[name=APP_NAME]": {
            "@value": "MY_FACEBOOK_APP_NAME"
        }
    }
}
```