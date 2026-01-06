import * as dat from "dat.gui";

export default class ui_overlay {
    ui = new dat.GUI();

    constructor() {
        this.param = new Object();
        this.param.x = 1;
        this.param.y = 1;
        this.param.z = 1;

        this.ui.add(this.param, "x", -4, 4, 0.1)
        this.ui.add(this.param, "y", -4, 4, 0.1)
        this.ui.add(this.param, "z", -4, 4, 0.1)
    }
}
