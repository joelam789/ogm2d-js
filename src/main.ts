
import { Aurelia } from 'aurelia-framework';
import * as i18nBackend from 'i18next-xhr-backend';

export function configure(aurelia: Aurelia) {

	aurelia
	.use
	.standardConfiguration()
	//.developmentLogging()  // should enable dev log when troubleshooting
	.plugin('aurelia-dialog', config => { // offical plug-in, see https://github.com/aurelia/dialog
		config.useDefaults();
		config.settings.lock = true;
		//config.settings.centerHorizontalOnly = false;
		config.settings.startingZIndex = 10;
		config.settings.position = (modalContainer, modalOverlay) => {
			modalContainer.style = "z-index: 10; overflow: hidden;";
			modalContainer.className = "active";
		};
	})
	.plugin('aurelia-i18n', (instance) => { // offical plug-in, see https://github.com/aurelia/i18n
        // register backend plugin
        instance.i18next.use(i18nBackend);
        // adapt options to your needs (see http://i18next.com/docs/options/)
        // make sure to return the promise of the setup method, in order to guarantee proper loading
        return instance.setup({
					backend: {                                  // <-- configure backend settings
						loadPath: './locale/{{lng}}.json', // <-- XHR settings for where to get the files from
					},
					lng : ((window as any).appConfig.ide.lang 
							&& (window as any).appConfig.ide.lang.toLowerCase() != 'default') 
							? (window as any).appConfig.ide.lang 
							: (navigator.language ? navigator.language.toLowerCase().substr(0, 2) : 'en'),
					attributes : ['t','i18n'],
					lowerCaseLng: true,
					fallbackLng : 'en',
					debug : false
        });
    })
	//.globalResources(['./loading-indicator']) // will load it with "require"
	;

	/*
	let url = window.location.pathname;
	let idx = url.lastIndexOf('/');
	let currentEntry = idx >= 0 ? url.substring(idx+1) : "";
	if (currentEntry.indexOf("index-tilemap") >= 0) {
		aurelia.start().then(() => aurelia.setRoot('tilemap-app'));
	} else {
		//aurelia.start().then(() => aurelia.setRoot('app4map', document.getElementById('tilemap-app')));
		aurelia.start().then(() => aurelia.setRoot());
	}
	*/

	//aurelia.start().then(() => aurelia.setRoot('app4map', document.getElementById('tilemap-app')));
	aurelia.start().then(() => aurelia.setRoot());

	

}
