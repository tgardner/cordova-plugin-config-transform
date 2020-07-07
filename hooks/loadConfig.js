const fs = require('fs');

module.exports = async ctx => {
    let configFile = null;
    if (ctx.opts.options && ctx.opts.options.config) {
        configFile = ctx.opts.options.config;
    } else {
        return;
    }

    if (!fs.existsSync(configFile)) {
        console.log(`${configFile} not found. Skipping.`);
        return;
    }

    let overrides = JSON.parse(fs.readFileSync(configFile));
    const baseConfig = fs.readFileSync('config.xml');

    if (!overrides) {
        console.log(`${configFile} empty. Skipping.`);
        return;
    }

    const attrSearch = /^([^\[]+)\[([^=]+)=([^\]]*)]$/;
    const override = (node, overrides) => {

        for (let i of Object.keys(overrides)) {
            const value = overrides[i];
            let matches = attrSearch.exec(i);

            if (i.startsWith("@")) {
                node.$ = node.$ || {};
                node.$[i.substring(1)] = value;
            } else if (matches != null) {
                const key = matches[1];
                const attribute = matches[2];
                const searchTerm = matches[3];
                node[key] = node[key] || [];
                let existing = node[key].find(n => n.$ && n.$[attribute] == searchTerm);
                if (existing == null) {
                    existing = {
                        $: {}
                    };
                    existing.$[attribute] = searchTerm;
                    node[key].push(existing);
                }
                override(existing, value);
            } else if (i === "_") {
                node[i] = value;
            } else {
                node[i] = node[i] || [];

                if (typeof (value) === 'string') {
                    for (var j of Object.keys(node[i])) {
                        node[i][j] = value;
                    }
                } else if (typeof (value) === 'object') {
                    if (node[i] instanceof Array) {
                        for (var j = 0; j < node[i].length; ++j) {
                            override(node[i][j], value);
                        }
                    } else {
                        override(node[i], value);
                    }
                }
            }
        }
    };

    // Rewrite config.xml
    const xml2js = require('xml2js');
    const base = await xml2js.parseStringPromise(baseConfig);
    override(base.widget, overrides);

    const builder = new xml2js.Builder();
    const result = builder.buildObject(base);

    fs.writeFileSync("config.xml", result);
    console.log(`config.xml updated from ${configFile}`);

    // Special consideration required for plugin override variables.
    // package.json directives take precedence over config.xml values
    // If a package.json file exists
    if (fs.existsSync("package.json")) {
        const packageJson = JSON.parse(fs.readFileSync("package.json"));
        if (packageJson && packageJson.cordova && packageJson.cordova.plugins) {
            let count = 0;

            for (const i of Object.keys(overrides)) {
                const matches = attrSearch.exec(i);
                if (!matches) continue;

                const key = matches[1];
                if (key != "plugin") continue;

                const name = matches[3];
                const plugin = packageJson.cordova.plugins[name];
                if (!plugin) continue;

                for (const j of Object.keys(overrides[i])) {
                    const varMatch = attrSearch.exec(j);
                    if (!varMatch) continue;
                    const variableName = varMatch[3];
                    const value = overrides[i][j]["@value"];
                    plugin[variableName] = value;
                    ++count;
                }
            }

            // Write back package.json
            if (count > 0) {
                fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
                console.log(`Updated ${count} variables in package.json`);
            }
        }
    }
};