
/**
 * @author featherJ
 */
export class Prop {
	public name: string = '';
	public type: string = '';
	public value: string = '';
	public available:string[] = [];
}
/**
 * @author featherJ
 */
export class ClassNode {
	public inEngine:boolean = false;
	public inPrompt:boolean = false;
	public fullName: string = '';
	public baseClass: ClassNode;
	public implementeds: ClassNode[] = [];
	public props: Prop[] = [];
	public isInterface:boolean = false;
}