function overlayConfirm() {
    let state = vm.overlayState;
    let name =  document.querySelector('#overlay input').value;
    let type = document.querySelector('#overlay select').value;
    let unit = vm.overlayMeta[0];
    let index = vm.overlayMeta[1];
    let subIndex = vm.overlayMeta[2];
    if (state == 'appprop' || state == 'preprop' || state == 'chtype') {
        let val = getDefaultValue(type);
        if (subIndex == undefined) {
            let newData = {
                prop: state == 'chtype' ? propName = vm.data[unit].cont[index].prop : name,
                type: type,
                val: val,
                expand: false,
                unit: unit
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
        if (subIndex == undefined) vm.data[unit].cont.splice(index, 1);
        else vm.data[unit].cont[index].val.splice(subIndex, 1);
    }
    vm.overlayShow = false;
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