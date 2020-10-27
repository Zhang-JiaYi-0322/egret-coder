/**
 * XML工具类
 * @author featherJ
 */
export class XmlUtil {
	/**
	 * 以字符串的方式添加一个命名空间，重复将不再添加
	 * @param xmlStr
	 * @param ns
	 */
	public static addNamespace(xmlStr: string, prefix: string, uri: string): any {
		var has: boolean = false;
		var arr: string[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
		if (arr) {
			for (var i = 0; i < arr.length; i++) {
				var nsArr: string[] = String(arr[i]).match(/xmlns:(.*?)=(\"|\')(.*?)(\"|\')/);
				if (nsArr && nsArr[1] && nsArr[1] === prefix && nsArr[3] && nsArr[3] === uri) {
					has = true;
					break;
				}
			}
		}
		if (!has && arr) {
			var index = xmlStr.indexOf(arr[arr.length - 1]) + arr[arr.length - 1].length;
			var str1: string = xmlStr.slice(0, index);
			var str2: string = xmlStr.slice(index);
			var xmlnsInsertStr: string = ' xmlns:' + prefix + '=\"' + uri + '\"';
			xmlStr = str1 + xmlnsInsertStr + str2;
			return {
				'index': index,
				'xmlns': ' xmlns:' + prefix + '=\"' + uri + '\"'
			};
		}
		return null;
	}
}