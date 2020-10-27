import {NotificationType } from 'vscode-jsonrpc';
import  {CompletionItem,Range} from 'vscode-languageclient';
/**
 * 自动补全完成消息
 */
export class CompletionConfirmNotification {
    public static type: NotificationType<CompletionConfirmParams,EgretRO> =  new  NotificationType<CompletionConfirmParams,EgretRO>('completion/confirm')
}
/**
 * 自动补全完成参数
 */
export interface CompletionConfirmParams {
    item: CompletionItem;
    range: Range;
}
export interface EgretRO{
    number:1
}