import {CompletionItem, Range} from 'vscode-languageserver';
import { NotificationType } from 'vscode-jsonrpc';
import { EgretRO } from '../../client/protocolclient/ProtocolClient';

/**
 * 自动补全完成消息
 */
export class CompletionConfirmNotification {
    public static type: NotificationType<CompletionConfirmParams,EgretRO> = new NotificationType<CompletionConfirmParams,EgretRO> ('completion/confirm')
}
/**
 * 自动补全完成参数
 */
export interface CompletionConfirmParams {
    item: CompletionItem;
    range: Range;
}
