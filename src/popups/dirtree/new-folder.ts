import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

@autoinject
export class CreateNewFolderDlg {

    message: any = null;
    newFolderName: string = "";

    constructor(public controller: DialogController) {
        //controller.settings.centerHorizontalOnly = true;
    }

    activate(message) {
        this.message = message;
		this.newFolderName = message ? message.toString() : "";
        
    }

    deactivate() {

    }

    get currentFolderName() {
		let result = this.newFolderName ? this.newFolderName.toString() : "";
        return result;
    }
}
