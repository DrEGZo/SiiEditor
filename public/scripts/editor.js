function overlayConfirm() {
    vm.overlayShow = false;
    let state = vm.overlayState;
    if (/(appprop|preprop|chtype|rmprop)/.test(state)) {
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
        let name = vm.openTabs[vm.activeTab].name;
        let rmChilds = vm.overlayCheck[0];
        let checkPtr = vm.overlayCheck[1];
        let cpChilds = vm.overlayCheck[2];
        if (state == 'cpunit') vm.openTab(vm.copyUnit(name, cpChilds));
        if (state == 'rmunit') vm.deleteUnit(name, rmChilds, checkPtr);
    } else if (state == 'ptrwarn') {
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