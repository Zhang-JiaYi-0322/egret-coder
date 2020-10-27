/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {StringUtil} from '../utils/StringUtil';
import childProcess = require('child_process');
/**
 * 获取引擎版本
 * @author featherJ
 */
export class EgretVersions {
	public getVersion(callback: (versions: VersionObj[], currentVersion: VersionObj) => void, thisArg: any): void {
		var exec = childProcess.exec,
			versionsCmd = exec('egret versions', { cwd: '/' }, () => { });
		var versionsOutPut: string = '';
		versionsCmd.stdout.on('data', function (data: Buffer) {
			var str: string = data.toString('utf-8');
			if (str.indexOf('Egret Engine') === -1) {
				return;
			}
			if (versionsOutPut !== '' && versionsOutPut.lastIndexOf('\n') !== versionsOutPut.length) {
				versionsOutPut += '\n';
			}
			versionsOutPut += str;
		});

		//已安装的引擎版本
		var versionInfos: VersionObj[] = [];
		versionsCmd.on('exit', function (code, signal) {
			setTimeout(function () {
				if (versionsOutPut) {
					var versions: string[] = versionsOutPut.split('\n');
					for (var i = 0; i < versions.length; i++) {
						var versionStr: string = versions[i];
						var tempArr: string[] = versionStr.split(' ');
						tempArr.splice(0, 2);//前2位为Egret Engine 并不需要
						var version: string = tempArr.shift();
						version = StringUtil.trim(version);
						var versionPath: string = tempArr.join(' ');//后续为地址数组, 不直接取后一位 为避免地址中存在空格
						var path: string = StringUtil.trimLeft(versionPath);
						path = path.split('\\').join('/');
						if (path.charAt(path.length - 1) !== '/') {
							path += '/';
						}
						if (version) {
							versionInfos.push({ version: version, path: path });
						}
					}
				}
				getCurrentVersion();
			}, 50);
		});
		//当前安装的引擎
		var currentVersionInfo: VersionObj = null;
		function getCurrentVersion(): void {
			var exec = childProcess.exec,
				infoCmd = exec('egret info',{ cwd: '/' }, () => { });
			var infoOutPut: string = '';
			infoCmd.stdout.on('data', function (data: Buffer) {
				var str: string = data.toString('utf-8');
				if (infoOutPut !== '' && infoOutPut.lastIndexOf('\n') !== infoOutPut.length) {
					infoOutPut += '\n';
				}
				infoOutPut += str;
			});
			infoCmd.on('exit', function (code, signal) {
				setTimeout(function () {
					var versionArr: string[] = infoOutPut.match(/(?:[0-9]+\.)+[0-9]+/g);
					var pathArr: string[] = infoOutPut.match(/(?:[a-zA-Z]\:)?(?:[\\|\/][^\\|\/]+)+[\\|\/]?/g);
					var currentVersion: string = versionArr !== null ? versionArr[0] : '';
					var currentPath: string = pathArr !== null ? pathArr[0] : '';
					currentPath = currentPath.replace(/\n/g, '');
					currentPath = currentPath.replace(/\r/g, '');
					if (currentPath.charAt(currentPath.length - 1) !== '/') {
						currentPath += '/';
					}
					currentVersionInfo = { version: currentVersion, path: currentPath };
					if (versionInfos.length === 0) {
						versionInfos.push(currentVersionInfo);
					}
					if (callback !== null) {
						callback.call(thisArg, versionInfos, currentVersionInfo);
					}
				}, 50);
			});
		}
	}
}

export interface VersionObj {
	/**版本 */
	version: string;
	/**路径 */
	path: string;
}