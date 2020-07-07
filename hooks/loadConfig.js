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

    const attrSearch = /^\[([^=]+)=([^\]]*)]$/;
    const override = (node, overrides) => {

        for (let i of Object.keys(overrides)) {
            const value = overrides[i];
            let matches = attrSearch.exec(i);

            if (i.startsWith("@")) {
                node.$ = node.$ || {};
                node.$[i.substring(1)] = value;
            } else if (matches != null) {
                const attribute = matches[1];
                const searchTerm = matches[2];
                node = node || [];
                let existing = node.find(n => n.$ && n.$[attribute] == searchTerm);
                if (existing == null) {
                    existing = {
                        $: {}
                    };
                    existing.$[attribute] = searchTerm;
                    node.push(existing);
                }
                override(existing, value);
            } else if (i === "_") {
                node[i] = value;
            } else {
                node[i] = node[i] || [];

                if (typeof (value) === 'string') {
                    node[i][0] = value;
                } else if (typeof (value) === 'object') {
                    override(node[i], value);
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
    if(overrides.plugin) {
        // If a package.json file exists
        if(fs.existsSync("package.json")) {
            // Update the plugin variables if present
            const packageJson = JSON.parse(fs.readFileSync("package.json"));
            if(packageJson.cordova && packageJson.cordova.plugins) {
                let count = 0;
                for(const i of Object.keys(overrides.plugin)) {
                    const matches = attrSearch.exec(i);
                    if(matches == null) continue;

                    const override = overrides.plugin[i];
                    const plugin = packageJson.cordova.plugins[matches[2]];
                    if(!override.variable || !plugin) continue;

                    for(const j of Object.keys(override.variable)) {
                        const variableMatches = attrSearch.exec(j);
                        if(variableMatches == null) continue;

                        const variableName = variableMatches[2];
                        const value = override.variable[j]["@value"];
                        plugin[variableName] = value;
                        ++count;
                    }
                }

                // Write back package.json
                if(count > 0) {
                    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
                    console.log(`Updated ${count} variables in package.json`);
                }
            }
        }
    }
};