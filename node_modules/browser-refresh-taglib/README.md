browser-refresh-taglib
======================

Taglib to enable browser page refresh in response to file modifications on the server and when the processed was using the [browser-refresh](https://github.com/patrick-steele-idem/browser-refresh) process launcher.

# Installation

```bash
npm install browser-refresh-taglib --save
```

# Usage

```html
<!doctype html>
<html lang="en">
    <head>
        ...
    </head>
    <body>
        ...
        
        <browser-refresh enabled="true"/>
    </body>
</html>
```

If the process has been launched using [browser-refresh](https://github.com/patrick-steele-idem/browser-refresh) then the output of the tag will be similar to the following:

```html
<script src="http://localhost:51066/browser-refresh.js"></script>
```

If the process was _not_ launched using [browser-refresh](https://github.com/patrick-steele-idem/browser-refresh) then the tag will not produce any output. That is, it is safe for the tag to be used in production. 

# Maintainers

* Patrick Steele-Idem ([Github: @patrick-steele-idem](http://github.com/patrick-steele-idem)) ([Twitter: @psteeleidem](http://twitter.com/psteeleidem))

# Contribute

Pull requests, bug reports and feature requests welcome.

# License

ISC
