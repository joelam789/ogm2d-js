
import { Aurelia } from 'aurelia-framework';
import * as i18nBackend from 'i18next-xhr-backend';
import * as i18nBrowserLanguageDetector from 'i18next-browser-languagedetector';

export function configure(aurelia: Aurelia) {

	aurelia
	.use
	.standardConfiguration()
	//.developmentLogging()  // should enable dev log when troubleshooting
	.plugin('aurelia-dialog', config => { // offical plug-in, see https://github.com/aurelia/dialog
		config.useDefaults();
		config.settings.lock = true;
		config.settings.centerHorizontalOnly = false;
		config.settings.startingZIndex = 5;
	})
	.plugin('aurelia-i18n', (instance) => { // offical plug-in, see https://github.com/aurelia/i18n
        // register backend plugin
        instance.i18next.use(i18nBackend).use(i18nBrowserLanguageDetector);
        // adapt options to your needs (see http://i18next.com/docs/options/)
        // make sure to return the promise of the setup method, in order to guarantee proper loading
        return instance.setup({
					backend: {                                  // <-- configure backend settings
						loadPath: './locale/{{lng}}.json', // <-- XHR settings for where to get the files from
					},
					detection: {
						order: ['localStorage', 'cookie', 'navigator'],
						lookupCookie: 'i18next',
						lookupLocalStorage: 'i18nextLng',
						caches: ['localStorage', 'cookie']
					},
					lng : (window as any).appConfig.ide.lang ? (window as any).appConfig.ide.lang : 'en',
					attributes : ['t','i18n'],
					lowerCaseLng: true,
					fallbackLng : 'en',
					debug : false
        });
    })
	//.globalResources(['./loading-indicator']) // will load it with "require"
	;

	aurelia.start().then(() => aurelia.setRoot());

}
