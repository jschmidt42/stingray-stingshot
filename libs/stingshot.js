define([
    'stingray',
    'services/engine-service',
    'services/file-system-service',
    'services/host-service'
],function (stingray, engineService, fileSystemService, hostService) {
    "use strict";

    const LEVEL_FILE_PATH_KEY_NAME = 'stingshot-level-file-path';

    let userSaveImageFilePath = window.localStorage.getItem(LEVEL_FILE_PATH_KEY_NAME) || stingray.env.userSettingsDir;

    engineService.sendToLocalEditors('require "stingshot/stingshot"');

    function listenForThumbnailGeneration () {
        return new Promise((resolve, reject) => {
            let offListenForThumbnailGeneration = engineService.addEditorEngineMessageHandler('thumbnail', (engine, message, data) => {
                var blob = new Blob([data], {type: 'image/png'});
                var imageReader = new FileReader();
                imageReader.addEventListener("loadend", function() {
                    fileSystemService.writeFile(userSaveImageFilePath, this.result)
                        .then(() => hostService.openUrl(userSaveImageFilePath))
                        .then(() => offListenForThumbnailGeneration())
                        .then(resolve, reject);
                });
                imageReader.readAsArrayBuffer(blob);
            });
        });
    }

    function takeFocusViewportScreenshot () {
        return hostService.openNativeDialog(
            hostService.DialogType.SaveFile,
            userSaveImageFilePath,
            'Save screenshot at...',
            'PNG|.png',
            true
        ).then(selectedPath => {
            if (!selectedPath)
                return Promise.reject('canceled');
            userSaveImageFilePath = selectedPath;
            window.localStorage.setItem(LEVEL_FILE_PATH_KEY_NAME, userSaveImageFilePath);
            listenForThumbnailGeneration();
            return engineService.sendToLocalEditors('Stingshot.remove_focus_viewport_hud()')
                .then(() => engineService.postEditorCallback())
                .then(() => engineService.sendToLocalEditors('Stingshot.take_focus_viewport_screenshot()'))
                .then(() => engineService.sendToLocalEditors('Stingshot.restore_focus_viewport_hud()'));
        });
    }

    return {
        takeFocusViewportScreenshot
    };
});
