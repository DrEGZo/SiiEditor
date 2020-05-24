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
            openTabs: [],
            activeTab: -1,
            alertMsg: ''
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
            openTab: function (item) {
                let alreadyOpen = false;
                let openAtIndex = this.openTabs.length;
                for (let i = 0; i < this.openTabs.length; i++) {
                    if (this.openTabs[i].index == item.index) {
                        alreadyOpen = true;
                        openAtIndex = i;
                        break;
                    }
                }
                if (!alreadyOpen) {
                    this.openTabs.push({
                        name: item.name,
                        index: item.index,
                        i: this.openTabs.length
                    });
                } 
                this.activeTab = openAtIndex;
            },
            closeTab: function (index) {
                this.openTabs.splice(index, 1);
                for (let i = index; i < this.openTabs.length; i++) {
                    let copy = this.openTabs[i];
                    copy.i = i;
                    this.openTabs.splice(i, 1, copy);
                }
                if (this.activeTab == index)  {
                    if (index == this.openTabs.length) this.activeTab--;
                } else if (this.activeTab > index) this.activeTab--;
            },
            swapTabs: function (a, b) {
                let copy = this.openTabs[a];
                this.openTabs.splice(a, 1, this.openTabs[b]);
                this.openTabs.splice(b, 1, copy);
                this.openTabs[a].i = a;
                this.openTabs[b].i = b;
                if (this.activeTab == a) this.activeTab = b;
                else if (this.activeTab == b) this.activeTab = a;
            }
        },
        computed: {
            screenClass: function () {
                return 'c' + this.screen;
            },
            getProps: function () {
                if (this.activeTab == -1) return [];
                else return this.data[this.openTabs[this.activeTab].index].cont;
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