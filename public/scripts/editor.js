function overlayConfirm() {
    let state = vm.overlayState;
    vm.overlayWarn = false;
    if (/(appprop|preprop|chtype|rmprop)/.test(state)) {
        vm.overlayShow = false;
        let name =  document.querySelector('#overlay input').value;
        let type = document.querySelector('#overlay select').value;
        let unit = vm.units[vm.openTabs[vm.activeTab].name];
        let index = vm.overlayMeta[0];
        let subIndex = vm.overlayMeta[1];
        if (state == 'appprop' || state == 'preprop' || state == 'chtype') {
            let val = getDefaultValue(type);
            if (subIndex == undefined) {
                let newData = {
                    prop: state == 'chtype' ? propName = vm.data[unit].cont[index].prop : name,
                    type: type,
                    val: val,
                    expand: false
                }
                vm.data[unit].cont.splice(state == 'appprop' ? index + 1 : index, state == 'chtype' ? 1 : 0, newData);
            } else {
                let newData = {
                    type: type,
                    val: val
                };
                vm.data[unit].cont[index].val.splice(state == 'appprop' ? subIndex + 1 : subIndex, state == 'chtype' ? 1 : 0, newData)
            }
        } else if (state == 'rmprop') {
            if (subIndex == undefined) {
                if (vm.data[unit].cont[index].type == 'pointer') updateRef(vm.data[unit].name, vm.data[unit].cont[index].val);
                vm.data[unit].cont.splice(index, 1);
            } else {
                if (vm.data[unit].cont[index].val[subIndex].type == 'pointer') updateRef(vm.data[unit].name, vm.data[unit].cont[index].val[subIndex].val);
                vm.data[unit].cont[index].val.splice(subIndex, 1);
            }
        }
    } else if (/(cpunit|rmunit)/.test(state)) {
        vm.overlayShow = false;
        let name = vm.openTabs[vm.activeTab].name;
        let rmChilds = vm.overlayCheck[0];
        let checkPtr = vm.overlayCheck[1];
        let cpChilds = vm.overlayCheck[2];
        if (state == 'cpunit') vm.openTab(vm.copyUnit(name, cpChilds));
        if (state == 'rmunit') vm.deleteUnit(name, rmChilds, checkPtr);
    } else if (state == 'ptrwarn') {
        vm.overlayShow = false;
        let child = vm.overlayMeta[0][0];
        for (let i = 0; i < vm.refs[child].refBy.length; i++) {
            let parent = vm.refs[child].refBy[i];
            let index = vm.units[parent];
            for (let j = 0; j < vm.data[index].cont.length; j++) {
                let type = vm.data[index].cont[j].type;
                if (type == 'pointer') {
                    if (vm.data[index].cont[j].val == child) vm.data[index].cont[j].val = 'null';
                } else if (type.includes('array')) {
                    for (let k = 0; k < vm.data[index].cont[j].val.length; k++) {
                        if (vm.data[index].cont[j].val[k].val == child) vm.data[index].cont[j].val[k].val = 'null';
                    }
                }
            }
            updateRef(parent, child);
        }
        vm.deleteUnit(child, vm.overlayMeta[2], true);
    } else if (state == 'rename') {
        let name = document.querySelector('#overlay input').value;
        let unit = vm.openTabs[vm.activeTab].name;
        if (!/^[a-z_][a-z_0-9]{0,11}([.][a-z_0-9]{1,12})*$/.test(name)) {
            vm.overlayWarn = true;
            console.log('cannot rename: invalid unit name');
            return;
        };
        let temp = vm.overlayCheck[3];
        if (temp) name = '.' + name;
        if (name in vm.units) {
            vm.overlayWarn = true;
            console.log('cannot rename: unit already exists');
            return;
        };
        vm.overlayShow = false;
        // units
        let index = vm.units[unit];
        delete vm.units[unit];
        Vue.set(vm.units, name, index);
        // data
        Vue.set(vm.data[index], 'name', name);
        // types
        let type = vm.data[index].type;
        let i = vm.types[type].entries.indexOf(unit);
        vm.types[type].entries.splice(i, 1, name);
        // tabs
        for (i = 0; i < vm.openTabs.length; i++) {
            if (vm.openTabs[i].name == unit) Vue.set(vm.openTabs[i], 'name', name); 
        }
        // refs
        let copy = vm.refs[unit];
        delete vm.refs[unit];
        vm.refs[name] = copy;
        for (i = 0; i < vm.refs[name].refs.length; i++) {
            let ref = vm.refs[name].refs[i];
            let j = vm.refs[ref].refBy.indexOf(unit);
            vm.refs[ref].refBy.splice(j, 1, name);
        }
        for (i = 0; i < vm.refs[name].refBy.length; i++) {
            let ref = vm.refs[name].refBy[i];
            let idx = vm.units[ref];
            for (let j = 0; j < vm.data[idx].cont.length; j++) {
                if (vm.data[idx].cont[j].type == 'pointer') {
                    if (vm.data[idx].cont[j].val == unit) Vue.set(vm.data[idx].cont[j], 'val', name);  
                }
                if (vm.data[idx].cont[j].type.includes('array')) {
                    for (let k = 0; k < vm.data[idx].cont[j].val.length; k++) {
                        if (vm.data[idx].cont[j].val[k].type == 'pointer') {
                            if (vm.data[idx].cont[j].val[k].val == unit) Vue.set(vm.data[idx].cont[j].val[k], 'val', name);
                        }
                    }
                }
            }
            idx = vm.refs[ref].refs.indexOf(unit);
            vm.refs[ref].refs.splice(idx, 1, name);
        }
    } else if (state == 'clsname') {
        let type = document.querySelector('#overlay input').value;
        if (!/^[a-z_]+$/.test(type)) {
            vm.overlayWarn = true;
            return;
        }
        vm.overlayMeta = [type];
        vm.overlayState = 'newunit';
    } else if (state == 'newunit') {
        let name = document.querySelector('#overlay input').value;
        let type = vm.overlayMeta[0];
        if (!/^[a-z_][a-z_0-9]{0,11}([.][a-z_0-9]{1,12})*$/.test(name)) {
            vm.overlayWarn = true;
            console.log('cannot name unit: invalid unit name');
            return;
        };
        let temp = vm.overlayCheck[3];
        if (temp) name = '.' + name;
        if (name in vm.units) {
            vm.overlayWarn = true;
            console.log('cannot name unit: unit already exists');
            return;
        };
        vm.overlayShow = false;
        vm.refs[name] = [];
        vm.refs[name].push({
            refs: [],
            refBy: []
        });
        if (!(type in vm.types)) Vue.set(vm.types, type, {
            entries: [],
            state: false
        });
        vm.types[type].entries.push(name);
        vm.units[name] = vm.data.length;
        vm.data.push({
            cont: [],
            name: name,
            type: type
        });
        vm.openTab(name);
    }
    document.querySelector('#overlay input').value = '';
    document.querySelector('#overlay select').value = 'string';
}

function getDefaultValue(type) {
    let val = '';
    if (type == 'boolean') val = false;
    if (type == 'number2') val = [0, 0];
    if (type == 'number3') val = [0, 0, 0];
    if (type == 'number4' || type == 'placementshort') val = [0, 0, 0, 0];
    if (type == 'placement') val = [0, 0, 0, 0, 0, 0, 0];
    if (type == 'token' || type == 'pointer') val = 'null';
    if (type == 'array' || type == 'arrayi') val = [];
    return val;
}

function updateRef(parent, oldChild, newChild) {
    if (oldChild in vm.refs) {
        let index = vm.units[parent];
        let refPersists = false;
        for (let i = 0; i < vm.data[index].cont.length; i++) {
            let type = vm.data[index].cont[i].type;
            if (!type.includes('array')) {
                if (type == 'pointer' && vm.data[index].cont[i].val == oldChild) refPersists = true; 
                if (refPersists) break;
            } else {
                for (let j = 0; j < vm.data[index].cont[i].val.length; j++) {
                    let type = vm.data[index].cont[i].val[j].type;
                    if (type == 'pointer' && vm.data[index].cont[i].val[j].val == oldChild) refPersists = true;
                    if (refPersists) break;
                }
            }
        }
        if (!refPersists) {
            let i = vm.refs[parent].refs.indexOf(oldChild);
            let j = vm.refs[oldChild].refBy.indexOf(parent);
            vm.refs[parent].refs.splice(i, 1);
            vm.refs[oldChild].refBy.splice(j, 1);
        }
    }
    
    if (newChild == undefined) return;
    // nc: prüfen, ob nc eine Unit ist. Wenn ja, prüfen, ob Ref schon vorhanden. Wenn nein, Ref hinzufügen.
    if (newChild in vm.refs) {
        if (vm.refs[parent].refs.indexOf(newChild) == -1) {
            vm.refs[parent].refs.push(newChild);
            vm.refs[newChild].refBy.push(parent);
        }
    }
}