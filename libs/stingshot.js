define([
    'stingray',
    'services/engine-service',
    'services/file-system-service',
    'services/host-service'
],function (stingray, engineService, fileSystemService, hostService) {
    "use strict";

    const LEVEL_FILE_PATH_KEY_NAME = 'stingshot-level-file-path';

    let userSaveImageFilePath = window.localStorage.getItem(LEVEL_FILE_PATH_KEY_NAME) || stingray.env.userSettingsDir;

    let listenForThumbnailGeneration = () => {
        return engineService.addEditorEngineMessageHandler('thumbnail', (engine, message, data) => {
            var blob = new Blob([data], {type: 'image/png'});
            var imageReader = new FileReader();
            imageReader.addEventListener("loadend", () => {
                return fileSystemService.writeFile(userSaveImageFilePath, this.result).then(() => {
                    return hostService.openUrl(userSaveImageFilePath);
                });
            });
            imageReader.readAsArrayBuffer(blob);
        });
    }

    engineService.sendToLocalEditors('require "stingshot/stingshot"');

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
            let offListenForThumbnailGeneration = listenForThumbnailGeneration();
            return engineService.sendToLocalEditors('Stingshot.remove_focus_viewport_hud()')
                .then(() => engineService.postEditorCallback())
                .then(() => engineService.sendToLocalEditors('Stingshot.take_focus_viewport_screenshot()'))
                .then(() => engineService.sendToLocalEditors('Stingshot.restore_focus_viewport_hud()'))
                .then(() => offListenForThumbnailGeneration());
        });
    }

    return {
        takeFocusViewportScreenshot
    };
});
