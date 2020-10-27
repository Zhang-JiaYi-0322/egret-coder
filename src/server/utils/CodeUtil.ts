/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {StringUtil} from './StringUtil';
/**
 * 从ts文件读取类名列表的工具类
 * @author dom
 */
export class ClassReader {
    /**
     * 获取TS文件里包含的类名,接口名,全局变量，或全局函数列表
     */
    public static readClassNameFromTS(tsText: string, dts: boolean = false): string[] {
        var list: string[] = [];
        if (tsText) {
            tsText = tsText.split('\r\n').join('\n').split('\r').join('\n');
            ClassReader.analyzeModule(tsText, list, '', dts);
        }
        return list;
    }

    /**
	 * 分析一个ts文件
	 */
    private static analyzeModule(text: string, list: string[], moduleName: string = '', dts: boolean = false): void {
        var block: string = '';
        while (text.length > 0) {
            var indexObj = CodeUtil.getFirstVariableIndex(['module', 'namespace'], text);
            if (indexObj.index === -1) {
                ClassReader.readClassFromBlock(text, list, moduleName, dts);
                break;
            } else {
                ClassReader.readClassFromBlock(text.substring(0, indexObj.index + indexObj.key.length), list, moduleName, dts);
                text = text.substring(indexObj.index + indexObj.key.length);
                var ns: string = CodeUtil.getFirstWord(text);
                ns = CodeUtil.trimVariable(ns);
                indexObj.index = CodeUtil.getBracketEndIndex(text);
                if (indexObj.index === -1) {
                    break;
                }
                block = text.substring(0, indexObj.index);
                text = text.substring(indexObj.index + 1);
                indexObj.index = block.indexOf('{');
                block = block.substring(indexObj.index + 1);
                if (moduleName) {
                    ns = moduleName + '.' + ns;
                }
                ClassReader.analyzeModule(block, list, ns, dts);
            }
        }
    }

    /**
     * 从代码块中分析引用关系，代码块为一个Module，或类外的一段全局函数定义
     */
    private static readClassFromBlock(text: string, list: string[], ns: string, dts: boolean): void {
        var newText: string = '';
        while (text.length > 0) {
            var index = text.indexOf('{');
            if (index === -1) {
                newText += text;
                break;
            }
            newText += text.substring(0, index);
            text = text.substring(index);
            index = CodeUtil.getBracketEndIndex(text);
            if (index === -1) {
                newText += text;
                break;
            }
            text = text.substring(index + 1);
        }
        text = newText;
        while (text.length > 0) {
            index = ClassReader.getFirstKeyWordIndex(['class'], text, ns, dts);
            var interfaceIndex = ClassReader.getFirstKeyWordIndex(['interface'], text, ns, dts);
            var enumIndex = ClassReader.getFirstKeyWordIndex(['enum'], text, ns, dts);
            var functionIndex = ClassReader.getFirstKeyWordIndex(['function'], text, ns, dts);
            var varIndex = ClassReader.getFirstKeyWordIndex(['var'], text, ns, dts);
            var letIndex = ClassReader.getFirstKeyWordIndex(['let'], text, ns, dts);
            index = Math.min(interfaceIndex, index, enumIndex, functionIndex, varIndex);
            if (index === Number.MAX_VALUE) {
                break;
            }

            var isVar: boolean = (index === varIndex);
            var isLet: boolean = (index === letIndex);
            var keyLength = 5;
            switch (index) {
                case varIndex:
                    keyLength = 3;
                    break;
                case letIndex:
                    keyLength = 3;
                    break;
                case interfaceIndex:
                    keyLength = 9;
                    break;
                case functionIndex:
                    keyLength = 8;
                    break;
                case enumIndex:
                    keyLength = 4;
                    break;
            }

            text = text.substring(index + keyLength);
            var word: string = CodeUtil.getFirstVariable(text);
            if (word) {
                var className: string;
                if (ns) {
                    className = ns + '.' + word;
                }
                else {
                    className = word;
                }
                if (list.indexOf(className) === -1) {
                    list.push(className);
                }
                text = CodeUtil.removeFirstVariable(text);
            }
            if (isVar || isLet) {
                index = text.indexOf('\n');
                if (index === -1) {
                    index = text.length;
                }
                text = text.substring(index);
            }
            else {
                index = CodeUtil.getBracketEndIndex(text);
                text = text.substring(index + 1);
            }
        }
    }

    /**
	 * 读取第一个关键字的索引
	 */
    private static getFirstKeyWordIndex(keys: string[], text: string, ns: string, dts: boolean): number {
        var preText: string = '';
        var indexObj = { index: Number.MAX_VALUE, key: '' };
        while (text.length > 0) {
            var indexObj = CodeUtil.getFirstVariableIndex(keys, text);
            if (indexObj.index === -1) {
                indexObj.index = Number.MAX_VALUE;
            }
            else if (ns) {
                if (!dts && CodeUtil.getLastWord(text.substring(0, indexObj.index)) !== 'export') {
                    preText = text.substring(0, indexObj.index + indexObj.key.length);
                    text = text.substring(indexObj.index + indexObj.key.length);
                    indexObj.index = Number.MAX_VALUE;
                    continue;
                }
            }
            break;
        }
        if (indexObj.index !== Number.MAX_VALUE) {
            indexObj.index += preText.length;
        }
        return indexObj.index;
    }
}

/**
 * 过滤代码中的所有常量和注释内容的工具类
 * @author dom
 */
export class CodeFilter {
    /**
     * 是否为占位符
     */
    public static isNBSP(str: string): boolean {
        if (!str || str.length < 3) {
            return false;
        }
        return str.charAt(0) === '\v' && str.charAt(str.length - 1) === '\v';
    }
    /**
     * 获取文本末尾的占位符。若最后一个字符不是占位符。返回''
     */
    public static getLastNBSP(str: string): string {
        if (!str || str.length < 3 || str.charAt(str.length - 1) !== '\v') {
            return '';
        }
        str = str.substring(0, str.length - 1);
        var index: number = str.lastIndexOf('\v');
        if (index === -1) {
            return '';
        }
        var char: string = str.substring(index + 1);
        if (isNaN(parseInt(char))) {
            return '';
        }
        return str.substring(index) + '\v';
    }
    /**
     * 获取文本末尾的占位符。若最后一个字符不是占位符。返回''
     */
    public static getFirstNBSP(str: string): string {
        if (!str || str.length < 3 || str.charAt(0) !== '\v') {
            return '';
        }
        str = str.substring(1);
        var index: number = str.indexOf('\v');
        if (index === -1) {
            return '';
        }
        var char: string = str.substring(0, index);
        if (isNaN(parseInt(char))) {
            return '';
        }
        return '\v' + str.substring(0, index + 1);
    }

    private getCommentIndex(str: string): number {
        return parseInt(str.substring(1, str.length - 1));
    }

    private nbsp: string = null;
    /**
     * 获取占位符
     */
    private getNBSP(): string {
        if (this.nbsp !== null) {
            return this.nbsp;
        }
        return '\v' + this.commentLines.length + '\v';
    }
    /**
     * 注释行
     */
    private commentLines: string[] = [];

    /**
     * 获取注释
     */
    public getCommentLine(index: number): string {
        if (index < 0 || index >= this.commentLines.length) {
            return '';
        }
        return this.commentLines[index];
    }


   	/**
	 * 移除代码注释和字符串常量
	 */
	public removeComment(codeText: string, nbsp: string = null): string {
		this.nbsp = nbsp;
		var trimText: string = '';
		codeText = codeText.split('\\\\').join('\v-0\v');
		codeText = codeText.split('\\\'').join('\v-1\v');
		codeText = codeText.split('\\\'').join('\v-2\v');
		codeText = codeText.split('\r\n').join('\n').split('\r').join('\n');
		this.commentLines = [];
		while (codeText.length > 0) {
			var commentIndex: number = codeText.indexOf('/*');
			if (commentIndex === -1) {
				commentIndex = Number.MAX_VALUE;
			}
			var lineCommonentIndex: number = codeText.indexOf('//');
			if (lineCommonentIndex === -1) {
				lineCommonentIndex = Number.MAX_VALUE;
			}
			var index: number = Math.min(commentIndex, lineCommonentIndex);
			if (index === Number.MAX_VALUE) {
				trimText += codeText;
				break;
			}
			trimText += codeText.substring(0, index) + this.getNBSP();
			codeText = codeText.substring(index);
			switch (index) {
				case commentIndex:
					index = codeText.indexOf('*/');
					if (index === -1) {
						index = codeText.length - 1;
					}
					this.commentLines.push(codeText.substring(0, index + 2));
					codeText = codeText.substring(index + 2);
					break;
				case lineCommonentIndex:
					index = codeText.indexOf('\n');
					if (index === -1) {
						index = codeText.length - 1;
					}
					this.commentLines.push(codeText.substring(0, index));
					codeText = codeText.substring(index);
					break;
			}
		}
		codeText = trimText.split('\v-0\v').join('\\\\');
		codeText = codeText.split('\v-1\v').join('\\\"');
		codeText = codeText.split('\v-2\v').join('\\\'');
		var length: number = this.commentLines.length;
		for (var i: number = 0; i < length; i++) {
			var constStr: string = this.commentLines[i];
			constStr = constStr.split('\v-0\v').join('\\\\');
			constStr = constStr.split('\v-1\v').join('\\\"');
			constStr = constStr.split('\v-2\v').join('\\\'');
			this.commentLines[i] = constStr;
		}
		return codeText;
	}
    /**
     * 更新缩进后，同步更新对应包含的注释行。
     * @param preStr 发生改变字符串之前的字符串内容
     * @param changeStr 发生改变的字符串
     * @param numIndent 要添加或减少的缩进。整数表示添加，负数减少。
     */
    public updateCommentIndent(changeStr: string, numIndent: number = 1): void {
        if (!changeStr) {
            return;
        }
        while (changeStr.length > 0) {
            var index: number = changeStr.indexOf('\v');
            if (index === -1) {
                break;
            }
            changeStr = changeStr.substring(index);
            var str: string = CodeFilter.getFirstNBSP(changeStr);
            if (str) {
                changeStr = changeStr.substring(str.length);
                index = this.getCommentIndex(str);
                if (numIndent > 0) {
                    this.commentLines[index] = CodeUtil.addIndent(this.commentLines[index], numIndent, true);
                }
                else {
                    this.commentLines[index] = CodeUtil.removeIndent(this.commentLines[index], -numIndent);
                }
            }
            else {
                changeStr = changeStr.substring(1);
            }
        }
    }
    /**
     * 回复注释行
     */
    public recoveryComment(codeText: string): string {
        if (!codeText) {
            return codeText;
        }
        var constArray: string[] = this.commentLines.concat();
        var tsText: string = '';
        while (codeText.length > 0) {
            var index: number = codeText.indexOf('\v');
            if (index === -1) {
                tsText += codeText;
                break;
            }
            tsText += codeText.substring(0, index);
            codeText = codeText.substring(index);
            var str: string = CodeFilter.getFirstNBSP(codeText);
            if (str) {
                index = this.getCommentIndex(str);
                tsText += constArray[index];
                codeText = codeText.substring(str.length);
            }
            else {
                tsText += '\v';
                codeText = codeText.substring(1);
            }
        }
        return tsText;
    }
}

/**
 * 代码解析工具类
 * @author dom
 */
export class CodeUtil {
    /**
     * 删除每行多余的缩进。
     * @param codeText 要处理的代码字符串
     * @param numIndent 每行要删除的缩进数量。默认删除一个\t或一个空白
     */
    public static removeIndent(codeText: string, numIndent: number = 1): string {
        var lines: string[] = codeText.split('\n');
        for (var i: number = lines.length - 1; i >= 0; i--) {
            var line: string = lines[i];
            var count: number = numIndent;
            while (count > 0) {
                var char: string = line.charAt(0);
                if (char === '\t') {
                    line = line.substring(1);
                }
                else if (char === ' ') {
                    var index: number = 4;
                    while (index > 0) {
                        if (line.charAt(0) === ' ') {
                            line = line.substring(1);
                        }
                        index--;
                    }
                }
                count--;
            }
            lines[i] = line;
        }
        codeText = lines.join('\n');
        return codeText;
    }
    /**
     * 每行增加相同数量缩进。
     * @param codeText 要处理的代码字符串
     * @param numIndent 要增加的缩进数量，使用\t字符
     * @param ignoreFirstLine 是否忽略第一行，默认false。
     */
    public static addIndent(codeText: string, numIndent: number = 1, ignoreFirstLine: Boolean = false): string {
        var lines: string[] = codeText.split('\n');
        for (var i: number = lines.length - 1; i >= 0; i--) {
            if (i === 0 && ignoreFirstLine) {
                continue;
            }
            var line: string = lines[i];
            var count: number = numIndent;
            while (count > 0) {
                line = '\t' + line;
                count--;
            }
            lines[i] = line;
        }
        codeText = lines.join('\n');
        return codeText;
    }
    /**
     * 判断一个字符串是否是常量，即全部大写的合法变量。
     */
    public static isConstant(word: string): Boolean {
        if (!CodeUtil.isVariableWord(word)) {
            return false;
        }
        var found: Boolean = false;
        for (var i: number = 2; i < word.length; i++) {
            var char: string = word.charAt(i);
            if (char >= 'a' && char <= 'z') {
                found = true;
                break;
            }
        }
        return !found;
    }

    /**
     * 判断一个字符串是否为合法变量名,第一个字符为字母,下划线或$开头，第二个字符开始为字母,下划线，数字或$
     */
    public static isVariableWord(word: string): Boolean {
        if (!word) {
            return false;
        }
        var char: string = word.charAt(0);
        if (!CodeUtil.isVariableFirstChar(char)) {
            return false;
        }
        var length: number = word.length;
        for (var i: number = 1; i < length; i++) {
            char = word.charAt(i);
            if (!CodeUtil.isVariableChar(char)) {
                return false;
            }
        }
        return true;
    }
    /**
     * 是否为合法变量字符,字符为字母,下划线，数字或$
     */
    public static isVariableChar(char: string): Boolean {
        return (char <= 'Z' && char >= 'A' || char <= 'z' && char >= 'a' ||
            char <= '9' && char >= '0' || char === '_' || char === '$');
    }
    /**
     * 是否为合法变量字符串的第一个字符,字符为字母,下划线或$
     */
    public static isVariableFirstChar(char: string): Boolean {
        return (char <= 'Z' && char >= 'A' || char <= 'z' && char >= 'a' ||
            char === '_' || char === '$');
    }

    /**
     * 判断一段代码中是否含有某个变量字符串，且该字符串的前后都不是变量字符。
     */
    public static containsVariable(key: string, codeText: string, notProperty: Boolean = false): Boolean {
        var contains: Boolean = false;
        while (codeText.length > 0) {
            var index: number = codeText.indexOf(key);
            if (index === -1) {
                break;
            }
            var lastChar: string = codeText.charAt(index + key.length);
            var firstChar: string = codeText.charAt(index - 1);
            if (!CodeUtil.isVariableChar(firstChar) && !CodeUtil.isVariableChar(lastChar) &&
                (!notProperty || (firstChar !== '.' && firstChar !== '@'))) {
                contains = true;
                break;
            }
            else {
                codeText = codeText.substring(index + key.length);
            }
        }
        return contains;
    }

    /**
     * 获取第一个含有key关键字的起始索引，且该关键字的前后都不是变量字符。
     */
    public static getFirstVariableIndex(keys: string[], codeText: string): { index: number, key: string } {
        var subLength: number = 0;

        while (codeText.length) {
            var indexObj = CodeUtil.indexOf(keys, codeText);
            if (indexObj.index === -1) {
                break;
            }
            var lastChar: string = codeText.charAt(indexObj.index + indexObj.key.length);
            var firstChar: string = codeText.charAt(indexObj.index - 1);
            if (!CodeUtil.isVariableChar(firstChar) && !CodeUtil.isVariableChar(lastChar)) {
                return { index: subLength + indexObj.index, key: indexObj.key };
            }
            else {
                subLength += indexObj.index + indexObj.key.length;
                codeText = codeText.substring(indexObj.index + indexObj.key.length);
            }
        }
        return { index: -1, key: '' };
    }

	public static indexOf(keys: string[], content: string): { index: number, key: string } {
		var reg: string = '';
		for (var i = 0; i < keys.length; i++) {
			reg += keys[i];
			if (i !== keys.length - 1) {
				reg += '|';
			}
		}
		var index = content.search(new RegExp(reg));
		if (index !== -1) {
			var targetStr: string = '';
			for (var i = 0; i < keys.length; i++) {
				if (content.substr(index, keys[i].length) === keys[i]) {
					targetStr = keys[i];
					break;
				}
			}
			return { index: index, key: targetStr };
		}
		return { index: -1, key: '' };
	}

    /**
     * 获取最后一个含有key关键字的起始索引，且该关键字的前后都不是变量字符。
     */
    public static getLastVariableIndex(key: string, codeText: string): number {
        while (codeText.length) {
            var index: number = codeText.lastIndexOf(key);
            if (index === -1) {
                break;
            }
            var lastChar: string = codeText.charAt(index + key.length);
            var firstChar: string = codeText.charAt(index - 1);
            if (!CodeUtil.isVariableChar(firstChar) && !CodeUtil.isVariableChar(lastChar)) {
                return index;
            }
            else {
                codeText = codeText.substring(0, index);
            }
        }
        return -1;
    }

    /**
     * 获取第一个词,遇到空白字符或 \n \r \t 后停止。
     */
    public static getFirstWord(str: string): string {
        str = StringUtil.trimLeft(str);
        var index: number = str.indexOf(' ');
        if (index === -1) {
            index = Number.MAX_VALUE;
        }
        var rIndex: number = str.indexOf('\r');
        if (rIndex === -1) {
            rIndex = Number.MAX_VALUE;
        }
        var nIndex: number = str.indexOf('\n');
        if (nIndex === -1) {
            nIndex = Number.MAX_VALUE;
        }
        var tIndex: number = str.indexOf('\t');
        if (tIndex === -1) {
            tIndex = Number.MAX_VALUE;
        }
        index = Math.min(index, rIndex, nIndex, tIndex);
        str = str.substr(0, index);
        return StringUtil.trim(str);
    }
    /**
     * 移除第一个词
     * @param str 要处理的字符串
     * @param word 要移除的词，若不传入则自动获取。
     */
    public static removeFirstWord(str: string, word: string = ''): string {
        if (!word) {
            word = CodeUtil.getFirstWord(str);
        }
        var index: number = str.indexOf(word);
        if (index === -1) {
            return str;
        }
        return str.substring(index + word.length);
    }
    /**
     * 获取最后一个词,遇到空白字符或 \n \r \t 后停止。
     */
    public static getLastWord(str: string): string {
        str = StringUtil.trimRight(str);
        var index: number = str.lastIndexOf(' ');
        var rIndex: number = str.lastIndexOf('\r');
        var nIndex: number = str.lastIndexOf('\n');
        var tIndex: number = str.indexOf('\t');
        index = Math.max(index, rIndex, nIndex, tIndex);
        str = str.substring(index + 1);
        return StringUtil.trim(str);
    }
    /**
     * 移除最后一个词
     * @param str 要处理的字符串
     * @param word 要移除的词，若不传入则自动获取。
     */
    public static removeLastWord(str: string, word: string = ''): string {
        if (!word) {
            word = CodeUtil.getLastWord(str);
        }
        var index: number = str.lastIndexOf(word);
        if (index === -1) {
            return str;
        }
        return str.substring(0, index);
    }
    /**
     * 获取字符串起始的第一个变量，返回的字符串两端均没有空白。若第一个非空白字符就不是合法变量字符，则返回空字符串。
     */
    public static getFirstVariable(str: string): string {
        str = StringUtil.trimLeft(str);
        var word: string = '';
        var length: number = str.length;
        for (var i: number = 0; i < length; i++) {
            var char: string = str.charAt(i);
            if (CodeUtil.isVariableChar(char)) {
                word += char;
            }
            else {
                break;
            }
        }
        return StringUtil.trim(word);
    }
    /**
     * 移除第一个变量
     * @param str 要处理的字符串
     * @param word 要移除的变量，若不传入则自动获取。
     */
    public static removeFirstVariable(str: string, word: string = ''): string {
        if (!word) {
            word = CodeUtil.getFirstVariable(str);
        }
        var index: number = str.indexOf(word);
        if (index === -1) {
            return str;
        }
        return str.substring(index + word.length);
    }
    /**
     * 获取字符串末尾的最后一个变量,返回的字符串两端均没有空白。若最后一个非空白字符就不是合法变量字符，则返回空字符串。
     */
    public static getLastVariable(str: string): string {
        str = StringUtil.trimRight(str);
        var word: string = '';
        for (var i: number = str.length - 1; i >= 0; i--) {
            var char: string = str.charAt(i);
            if (CodeUtil.isVariableChar(char)) {
                word = char + word;
            }
            else {
                break;
            }
        }
        return StringUtil.trim(word);
    }
    /**
     * 移除最后一个变量
     * @param str 要处理的字符串
     * @param word 要移除的变量，若不传入则自动获取。
     */
    public static removeLastVariable(str: string, word: string = ''): string {
        if (!word) {
            word = CodeUtil.getLastVariable(str);
        }
        var index: number = str.lastIndexOf(word);
        if (index === -1) {
            return str;
        }
        return str.substring(0, index);
    }
    /**
     * 获取一对括号的结束点,例如'class A{ function B(){} } class',返回24,若查找失败，返回-1。
     */
    public static getBracketEndIndex(codeText: string, left: string = '{', right: string = '}'): number {
        var indent: number = 0;
        var text: string = '';
        while (codeText.length > 0) {
            var index: number = codeText.indexOf(left);
            if (index === -1) {
                index = Number.MAX_VALUE;
            }
            var endIndex: number = codeText.indexOf(right);
            if (endIndex === -1) {
                endIndex = Number.MAX_VALUE;
            }
            index = Math.min(index, endIndex);
            if (index === Number.MAX_VALUE) {
                return -1;
            }
            text += codeText.substring(0, index + 1);
            codeText = codeText.substring(index + 1);
            if (index === endIndex) {
                indent--;
            } else {
                indent++;
            }
            if (indent === 0) {
                break;
            }
            if (codeText.length === 0) {
                return -1;
            }
        }
        return text.length - 1;
    }
    /**
     * 从后往前搜索，获取一对括号的起始点,例如'class A{ function B(){} } class',返回7，若查找失败，返回-1。
     */
    public static getBracketStartIndex(codeText: string, left: string = '{', right: string = '}'): number {
        var indent: number = 0;
        while (codeText.length > 0) {
            var index: number = codeText.lastIndexOf(left);
            var endIndex: number = codeText.lastIndexOf(right);
            index = Math.max(index, endIndex);
            if (index === -1) {
                return -1;
            }
            codeText = codeText.substring(0, index);
            if (index === endIndex) {
                indent++;
            } else {
                indent--;
            }
            if (indent === 0) {
                break;
            }
            if (codeText.length === 0) {
                return -1;
            }
        }
        return codeText.length;
    }

    /**
     * 去掉字符串两端所有连续的非变量字符。
     * @param str 要格式化的字符串
     */
    public static trimVariable(str: string): string {
        return CodeUtil.trimVariableLeft(CodeUtil.trimVariableRight(str));
    }
    /**
     * 去除字符串左边所有连续的非变量字符。
     * @param str 要格式化的字符串
     */
    public static trimVariableLeft(str: string): string {
        if (!str) {
            return '';
        }
        var char: string = str.charAt(0);
        while (str.length > 0 && !CodeUtil.isVariableFirstChar(char)) {
            str = str.substr(1);
            char = str.charAt(0);
        }
        return str;
    }
    /**
     * 去除字符串右边所有连续的非变量字符。
     * @param str 要格式化的字符串
     */
    public static trimVariableRight(str: string): string {
        if (!str) {
            return '';
        }
        var char: string = str.charAt(str.length - 1);
        while (str.length > 0 && !CodeUtil.isVariableChar(char)) {
            str = str.substr(0, str.length - 1);
            char = str.charAt(str.length - 1);
        }
        return str;
    }

    private static codeFilter: CodeFilter = new CodeFilter();
    /**
     * 移除代码里的注释和单引号双引号内容
     */
    public static removeComment(codeText: string): string {
        return CodeUtil.codeFilter.removeComment(codeText, '');
    }
}