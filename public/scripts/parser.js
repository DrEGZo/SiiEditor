onmessage = function (e) {
    if (e.data.type == 'siitojson') {
        parseSIItoJSON(e.data.sii).then((result) => {
            postMessage({ msg: 'result', data: result });
        }).catch((err) => {
            postMessage({ msg: 'error', data: err });
        });
    } else if (e.data.type == 'jsontosii') {
        parseJSONtoSII(e.data.json).then((result) => {
            postMessage({ msg: 'result', data: result });
        }).catch((err) => {
            postMessage({ msg: 'error', data: err });
        });
    }
}

function parseSIItoJSON(sii) {
    return new Promise((resolve, reject) => {
        // remove comments from sii file
        sii = sii.replace(/\/\/.*/g, '');
        sii = sii.replace(/\/\*[^]*\*\//g, '');
        sii = sii.replace(/#.*/g, '');
        // check for @include
        if (/@include/.test(sii)) reject('e10');
        // Data collections
        let globalUnitNames = {};
        let globalCityNames = [];
        let globalUnitTypes = {};
        let globalReferences = {};
        let result = [];
        let review_items = [];
        let review_arrays = [];
        // Regex to split up the SII
        let regex_siiUnit = /^\s*SiiNunit\s*{\s*(\S[^]+})\s*}\s*$/;
        let regex_units = /.+:.+\s*{[^}]*}/g;
        let regex_unitdata = /^\s*([a-z_]+)\s*:\s*([a-z0-9._]+)\s*{\s*([^]*)}/;
        let regex_contentlines = /^.*:.*$/mg;
        let regex_property = /^\s*([a-z0-9_\[\]]+)\s*:\s*(\S+.*\S+|\S)\s*$/;
        // Remove SII Frame and split in units
        if (!regex_siiUnit.test(sii)) reject('e11');
        let unitBlock = sii.match(regex_siiUnit)[1];
        let units = unitBlock.match(regex_units);
        if (units == null) units = [];
        for (let i = 0; i < units.length; i++) {
            // note name and type of unit, split content into lines
            if (!regex_unitdata.test(units[i])) reject('e12');
            let match = units[i].match(regex_unitdata);
            let unittype = match[1];
            let unitname = match[2];
            let unitcontent = match[3];
            let content = [];
            let arraylist = {};
            let contentlines = unitcontent.match(regex_contentlines);
            if (contentlines == null) contentlines = [];
            for (let j = 0; j < contentlines.length; j++) {
                // read property name and value, parse type and value
                if (!regex_property.test(contentlines[j])) reject('e13');
                let propmatch = contentlines[j].match(regex_property);
                let property = propmatch[1];
                let value = propmatch[2];
                let type = '';
                if (/^"\/\S+"$/.test(value)) {
                    type = 'path';
                    value = value.match(/^"(.*)"$/)[1];
                } else if (/^".*"$/.test(value)) {
                    type = 'string';
                    value = value.match(/^"(.*)"$/)[1];
                } else if (/^(true|false)$/.test(value)) {
                    type = 'boolean';
                    value = value == 'true';
                } else if (/^(-*[0-9.]+(e(\+|-)[0-9]+)?|&[0-9a-f]{8})$/.test(value)) {
                    type = 'number';
                    value = IEEE754toFloat(value);
                }
                else if (/^\(\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)$/.test(value)) {
                    type = 'number2';
                    value = IEEE754toFloat(value).match(/[^(),\s]+/g);
                } else if (/^\((\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,){2}\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)$/.test(value)) {
                    type = 'number3';
                    value = IEEE754toFloat(value).match(/[^(),\s]+/g);
                } else if (/^\((\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,){3}\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)$/.test(value)) {
                    type = 'number4';
                    value = IEEE754toFloat(value).match(/[^(),\s]+/g);
                } else if (/^\((\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,){2}\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)\s*\(\s*(-*[0-9.]+|&[0-9a-f]{8})\s*;(\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,){2}\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)$/.test(value)) {
                    type = 'placement';
                    value = IEEE754toFloat(value).match(/[^(),;\s]+/g);
                } else if (/^\(\s*(-*[0-9.]+|&[0-9a-f]{8})\s*;(\s*(-*[0-9.]+|&[0-9a-f]{8})\s*,){2}\s*(-*[0-9.]+|&[0-9a-f]{8})\s*\)$/.test(value)) {
                    type = 'placementshort';
                    value = IEEE754toFloat(value).match(/[^(),;\s]+/g);
                } else {
                    type = 'unknown';
                    review_items.push([i, j]);
                }
                // if property belongs to array, make a note of arrayname and type (indexed or loose)
                let arrmatch = property.match(/^([a-z_]+)\[([0-9]*)\]$/);
                if (arrmatch) {
                    if (!(arrmatch[1] in arraylist)) {
                        arraylist[arrmatch[1]] = {
                            type: /\[\]/.test(property) ? 'loose' : 'indexed',
                            startline: null,
                            values: []
                        }
                    } else {
                        if (arraylist[arrmatch[1]].type != (/\[\]/.test(property) ? 'loose' : 'indexed')) {
                            reject('e14');
                        }
                    }
                } else if (/[\[\]0-9]/.test(property)) reject('e15');
                // add the property to unit content
                content.push({
                    prop: property,
                    val: value,
                    type: type,
                    expand: false // for arrays
                });
            }
            // remember arrays of unit to deal with them later
            if (Object.keys(arraylist).length > 0) review_arrays.push([i, arraylist]);
            // note unit name
            globalUnitNames[unitname] = i;
            // create reference container
            globalReferences[unitname] = {
                refs: [],
                refBy: []
            };
            // note city names
            if (unittype == 'garage') globalCityNames.push(unitname.match(/^garage[.](.+)$/)[1]);
            // add to result
            result.push({
                type: unittype,
                name: unitname,
                cont: content
            });
            // remember unit types and which units belong to it
            if (unittype in globalUnitTypes) {
                globalUnitTypes[unittype].entries.push(unitname);
            } else {
                globalUnitTypes[unittype] = {
                    state: false,
                    entries: [unitname]
                };
            }
        }
        // replace unknown value types with pointer or token (external pointers are treated as tokens, thus there is no limit in length)
        for (let i = 0; i < review_items.length; i++) {
            let value = result[review_items[i][0]].cont[review_items[i][1]].val;
            let newType;
            if (value in globalUnitNames) newType = 'pointer';
            else if (/^[a-z0-9_.]+$/i.test(value)) newType = 'token';
            else reject('e16');
            result[review_items[i][0]].cont[review_items[i][1]].type = newType;
            // create reference
            if (value in globalUnitNames) {
                let parent = result[review_items[i][0]].name;
                globalReferences[parent].refs.push(value);
                globalReferences[value].refBy.push(parent);
            }
        }
        // review all arrays
        for (let i = 0; i < review_arrays.length; i++) {
            let toBeDeleted = [];
            for (let j = 0; j < result[review_arrays[i][0]].cont.length; j++) {
                let prop = result[review_arrays[i][0]].cont[j].prop;
                let type = result[review_arrays[i][0]].cont[j].type;
                let val = result[review_arrays[i][0]].cont[j].val;
                // if indexed, remember the counter line
                if (prop in review_arrays[i][1]) {
                    if (review_arrays[i][1][prop].type != 'indexed') reject('e17');
                    if (review_arrays[i][1][prop].startline == null) review_arrays[i][1][prop].startline = j;
                    else reject('e18');
                }
                // save values of array data, remember which lines to drop
                if (/]$/.test(prop)) {
                    let propname = prop.match(/^([a-z_]+)\[[0-9]*\]$/)[1];
                    if (/\[\]/.test(prop)) {
                        if (review_arrays[i][1][propname].startline == null) review_arrays[i][1][propname].startline = j;
                        else toBeDeleted.push(j);
                        review_arrays[i][1][propname].values.push({ type: type, val: val });
                    } else if (/\[[0-9]+\]/.test(prop)) {
                        review_arrays[i][1][propname].values.push({ type: type, val: val });
                        toBeDeleted.push(j);
                    }
                }
            }
            // replace the original array values
            for (let arrname in review_arrays[i][1]) {
                let line = review_arrays[i][1][arrname].startline;
                let values = review_arrays[i][1][arrname].values;
                let type = review_arrays[i][1][arrname].type;
                result[review_arrays[i][0]].cont[line].prop = arrname;
                result[review_arrays[i][0]].cont[line].val = values;
                result[review_arrays[i][0]].cont[line].type = (type == 'indexed') ? 'arrayi' : 'array';
            }
            // delete the unnecessary array item lines (highest to lowest index to avoid unwanted offset)
            toBeDeleted.sort((a, b) => ((a < b) ? 1 : -1));
            for (let j = 0; j < toBeDeleted.length; j++) result[review_arrays[i][0]].cont.splice(toBeDeleted[j], 1);
        }
        resolve({result: result, cities: globalCityNames, units: globalUnitNames, types: globalUnitTypes, refs: globalReferences });
    });
}

function IEEE754toFloat(value) {
    // https://stackoverflow.com/a/37471222
    return value.replace(/&[0-9a-f]{8}/g, function($0) {
        let buffer = new ArrayBuffer(4);
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < 4; i++) {
            bytes[i] = parseInt('0x' + $0.substr(i * 2 + 1, 2));
        }
        let view = new DataView(buffer);
        return view.getFloat32(0, false);
    }).replace(/([0-9][.][0-9]+)e([+-][0-9]+)/g, function($0, $1, $2) {
        return parseFloat($1) * Math.pow(10, parseInt($2));
    });
}

function parseJSONtoSII(json) {
    return new Promise((resolve, reject) => {
        let sii = 'SiiNunit\n{\n\n';
        for (let i = 0; i < json.length; i++) {
            sii += json[i].type + ' : ' + json[i].name + ' {\n';
            for (let j = 0; j < json[i].cont.length; j++) {
                let cont = json[i].cont[j];
                let val = parsePropertyValue(cont.prop, cont.type, cont.val);
                sii += (cont.type != 'array' ? ' ' + cont.prop + ': ' : '') + val;
            }
            sii += '}\n\n';
        }
        sii += '}';
        resolve(sii);
    });
}

function parsePropertyValue(prop, type, value) {
    let returnVal;
    if (type.match(/^(string|path)$/)) returnVal = '"' + value + '"\n';
    else if (type.match(/^number[2-4]$/)) returnVal = '(' + value.join(', ') + ')\n';
    else if (type == 'placement') returnVal = '(' + value.slice(0, 3).join(', ') + ') (' + value[3] + '; ' + value.slice(4).join(', ') + ')\n';
    else if (type == 'placementshort') returnVal = '(' + value[0] + '; ' + value.slice(1).join(', ') + ')\n';
    else if (type.match(/^arrayi*$/)) {
        returnVal = '';
        let indexed = type == 'arrayi';
        if (indexed) returnVal += value.length + '\n';
        for (let k = 0; k < value.length; k++) {
            let subVal = parsePropertyValue(null, value[k].type, value[k].val);
            if (prop === null) return null; 
            returnVal += ' ' + prop + '[' + (indexed ? k : '') + ']: ' + subVal;
        }
    } else returnVal = value + '\n';
    return returnVal;
}