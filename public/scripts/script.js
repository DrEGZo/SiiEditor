let vm;

let globalUnitNames = [];
let globalCityNames = [];
let globalRawText = '';

let main = function () {
    
    initUploader();

    vm = new Vue({
        el: '#app',
        data: {
            screen: 2,
            data: [],
            types: {},
            units: {},
            openTabs: [],
            activeTab: -1,
            alertMsg: '',
            overlayShow: false,
            overlayState: '',
            overlayMeta: [],
            overlayCheck: [true, true, true, true],
            overlayWarn: false,
            refs: {},
            unitSearchResult: [[], 0],
            typeSearchResult: []
        },
        methods: {
            changeScreen: function (screen) {
                this.screen = screen;
            },
            getPanelPosition: function (panel) {
                return {
                    left: ((this.screen - panel) * (-100)) + '%',
                    right: ((this.screen - panel) * 100) + '%',
                    opacity: panel == this.screen ? 1 : 0
                };
            },
            openTab: function (name) {
                if (!(name in this.units)) {
                    alert('Dangling pointer. Unit does not exist.');
                    return;
                }
                let alreadyOpen = false;
                let openAtIndex = this.openTabs.length;
                for (let i = 0; i < this.openTabs.length; i++) {
                    if (this.openTabs[i].name == name) {
                        alreadyOpen = true;
                        openAtIndex = i;
                        break;
                    }
                }
                if (!alreadyOpen) {
                    this.openTabs.push({
                        name: name,
                        filter: '',
                        pointerBak: ''
                    });
                } 
                this.activeTab = openAtIndex;
            },
            closeTab: function (index) {
                this.openTabs.splice(index, 1);
                if (this.activeTab == index)  {
                    if (index == this.openTabs.length) this.activeTab--;
                } else if (this.activeTab > index) this.activeTab--;
            },
            swapTabs: function (a, b) {
                let copy = this.openTabs[a];
                this.openTabs.splice(a, 1, this.openTabs[b]);
                this.openTabs.splice(b, 1, copy);
                if (this.activeTab == a) this.activeTab = b;
                else if (this.activeTab == b) this.activeTab = a;
            },
            openOverlay: function (name, metadata) {
                this.overlayState = name;
                this.overlayMeta = metadata;
                this.overlayWarn = false;
                let select = document.querySelector('#overlay select');
                select.value = 'string';
                if (name == 'chtype') {
                    let index = this.units[this.openTabs[this.activeTab].name];
                    if (metadata[1] == undefined) {
                        select.value = this.data[index].cont[metadata[0]].type;
                        this.overlayShow = true;
                    } else {
                        select.value = this.data[index].cont[metadata[0]].val[metadata[1]].type;
                        this.overlayShow = true;
                    }
                }
                if (name == 'appprop' || name == 'preprop') {
                    let index = this.units[this.openTabs[this.activeTab].name];
                    if (metadata[1] != undefined) {
                        if (this.data[index].cont[metadata[0]].val.length > 0) {
                            let type = this.data[index].cont[metadata[0]].val[metadata[1]].type;
                            let val = getDefaultValue(type);
                            let newData = { type: type, val: val };
                            this.data[index].cont[metadata[0]].val.splice(name == 'appprop' ? metadata[1] + 1 : metadata[1], 0, newData);
                            return;
                        }
                    }
                }
                this.overlayShow = true;
            },
            copyUnit: function (name, cpChilds) {
                let index = this.units[name];
                name = name.replace(/^(.+)(_[0-9]+)$/, ($0, $1) => $1);
                let i = 0;
                while ((name + '_' + i) in this.units) i++;
                name += '_' + i;
                let type = this.data[index].type;
                let props = [];
                this.types[type].entries.push(name);
                this.refs[name] = {
                    refs: [],
                    refBy: []
                };
                for (let i = 0; i < this.data[index].cont.length; i++) {
                    let prop = {
                        expand: false,
                        prop: this.data[index].cont[i].prop,
                        type: this.data[index].cont[i].type,
                        val: null
                    };
                    if (!prop.type.includes('array')) prop.val = this.data[index].cont[i].val;
                    else {
                        prop.val = [];
                        for (let j = 0; j < this.data[index].cont[i].val.length; j++) {
                            let itmType = this.data[index].cont[i].val[j].type;
                            let itmVal = this.data[index].cont[i].val[j].val;
                            if (itmType == 'pointer' && itmVal in this.units) {
                                if (cpChilds) itmVal = this.copyUnit(itmVal, true);
                                this.refs[name].refs.push(itmVal);
                                this.refs[itmVal].refBy.push(name);
                            } 
                            prop.val.push({
                                type: itmType,
                                val: itmVal
                            });
                        }
                    }
                    if (prop.type == 'pointer' && prop.val in this.units) {
                        if (cpChilds) prop.val = this.copyUnit(prop.val, true);
                        this.refs[name].refs.push(prop.val);
                        this.refs[prop.val].refBy.push(name);
                    }
                    props.push(prop);
                }
                this.data.push({
                    type: type,
                    name: name,
                    cont: props
                });
                this.units[name] = this.data.length - 1; // non-reactive!
                return name;
            },
            deleteUnit: function (name, rmChilds, checkPtr) {
                // checkPtr, ggf Dialog, cancel oder nulls
                if (this.refs[name].refBy.length > 0) {
                    if (checkPtr) {
                        let meta1 = [name, this.data[this.units[name]].type];
                        let meta2 = [];
                        for (let i = 0; i < this.refs[name].refBy.length; i++) {
                            let n = this.refs[name].refBy[i];
                            let t = this.data[this.units[n]].type;
                            meta2.push([n, t]);
                        }
                        this.openOverlay('ptrwarn', [meta1, meta2, this.overlayCheck[2]]);
                        return;
                    } else {
                        for (let i = 0; i < this.refs[name].refBy.length; i++) {
                            let parent = this.refs[name].refBy[i];
                            let j = this.refs[parent].refs.indexOf(name);
                            this.refs[parent].refs.splice(j, 1);
                            this.refs[name].refBy.splice(i, 1);
                        }
                    }
                } 

                // rmChilds (rekursiv, checkPtr mitgeben), davor refs auflösen
                while (this.refs[name].refs.length > 0) {
                    let child = this.refs[name].refs[0];
                    this.refs[name].refs.splice(0, 1);
                    let j = this.refs[child].refBy.indexOf(name);
                    this.refs[child].refBy.splice(j, 1);
                    if (rmChilds && this.refs[child].refBy.length == 0) {
                        this.deleteUnit(child, rmChilds, checkPtr);
                    }
                }

                // tabs prüfen, ggf schließen, löschen.
                for (let i = 0; i < this.openTabs.length; i++) {
                    if (this.openTabs[i].name == name) this.closeTab(i);
                }

                // löschvorgang
                let index = this.units[name];
                let type = this.data[index].type;
                let i = this.types[type].entries.indexOf(name);
                this.data.splice(index, 1);
                this.types[type].entries.splice(i, 1);
                delete this.refs[name];
                delete this.units[name];
                for (let i = index; i < this.data.length; i++) {
                    this.units[this.data[i].name] = i;
                }
            },
            pointerUpdate: function (newVal) {
                updateRef(this.openTabs[this.activeTab].name, this.openTabs[this.activeTab].pointerBak, newVal);
            },
            tokenUpdate: function (newVal, i, j) {
                if (newVal in this.units) {
                    let unit = this.openTabs[this.activeTab].name;
                    let index = this.units[unit];
                    if (j == undefined) this.data[index].cont[i].type = 'pointer';
                    else this.data[index].cont[i].val[j].type = 'pointer';
                    if (this.refs[unit].refs.indexOf(newVal) == -1) this.refs[unit].refs.push(newVal);
                    if (this.refs[newVal].refBy.indexOf(unit) == -1) this.refs[newVal].refBy.push(unit);
                }
            },
            unitSearch: function (query) {
                let result = [[], 0];
                if (query.length < 3) {
                    this.unitSearchResult = result;
                    return;
                }
                for (unit in this.units) {
                    if (unit.toLowerCase().includes(query.toLowerCase())) {
                        if (result[0].length < 5) result[0].push(unit);
                        result[1]++;
                    }
                }
                this.unitSearchResult = result;
            },
            typeSearch: function (query) {
                let result = [];
                if (query.length < 3 || this.overlayState != 'clsname') {
                    this.typeSearchResult = result;
                    return;
                }
                for (type in this.types) {
                    if (type.toLowerCase().includes(query.toLowerCase())) {
                        if (result.length < 5) result.push(type);
                    }
                }
                this.typeSearchResult = result;
            },
            confirmClassName: function (type) {
                document.querySelector('#overlay input').value = type;
            }
        },
        computed: {
            screenClass: function () {
                return 'c' + this.screen;
            },
            getProps: function () {
                if (this.activeTab == -1) return [];
                else return this.data[this.units[this.openTabs[this.activeTab].name]].cont;
            },
            overlayLabel: function () {
                if (this.overlayState == 'appprop') return 'Add New Attribute';
                if (this.overlayState == 'preprop') return 'Add New Attribute';
                if (this.overlayState == 'rmprop') return 'Remove Attribute?';
                if (this.overlayState == 'chtype') return 'Change Attribute Type';
                if (this.overlayState == 'rmunit') return 'Delete Unit';
                if (this.overlayState == 'cpunit') return 'Clone Unit';
                if (this.overlayState == 'ptrwarn') return 'Dangling Pointer Warning';
                if (this.overlayState == 'rename' || this.overlayState == 'newunit') return 'Enter Unit Name';
                if (this.overlayState == 'clsname') return 'Enter Class Name';
            },
            overlayInfo: function () {
                if (this.overlayState == 'rmprop') return 'Bear in mind that this cannot be undone.';
                if (this.overlayState == 'chtype') return 'This will override the porperty\'s current value.';
                if (this.overlayState == 'rmunit') return 'Bear in mind that this cannot be undone.';
                if (this.overlayState == 'ptrwarn') return 'Hit Confirm to replace the pointer with NULL or hit Cancel to keep this unit for now.';
                if (this.overlayState == 'rename' || this.overlayState == 'newunit') return 'Unit name is composed of components separated by dots. Each component has up to 12 characters (lowercase letters, numbers, underscores).';
            },
            canShowOption: function () {
                if (this.overlayState != 'chtype') return true;
                let unit = this.units[this.openTabs[this.activeTab].name];
                let index = this.overlayMeta[0];
                if (/arrayi*/.test(this.data[unit].cont[index].type)) {
                    return this.data[unit].cont[index].val.length == 0;
                } else return true;
            },
            getTabInfo: function () {
                if (this.activeTab == -1) return '';
                let name = this.openTabs[this.activeTab].name;
                let type = this.data[this.units[name]].type;
                return type + ': ' + name;
            }
        }
    });
}

function showAlert(msg) {
    vm.alertMsg = msg;
    let alert = document.getElementById('alert');
    alert.style.bottom = '10px';
    setTimeout(() => { alert.style.bottom = '-60px' }, 3000);
}

window.addEventListener('load', main);