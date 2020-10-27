import {NotificationType } from 'vscode-jsonrpc';
import { EgretRO } from '../client/protocolclient/ProtocolClient';

export class TestNotificationCS {
    public static type: NotificationType<TestParamsCS,EgretRO> = new   NotificationType<TestParamsCS,EgretRO>('exml/notif/testCS')
}
export interface TestParamsCS {
    testArg: string;
}

export class TestNotificationSC {
    public static type: NotificationType<TestParamsSC,EgretRO> = new NotificationType<TestParamsSC,EgretRO> ('exml/notif/testSC')
}
export interface TestParamsSC {
    testArg: string;
}


export class ClassChangedNotifSC {
    public static type: NotificationType<ClassChangedParamsSC,EgretRO> = new  NotificationType<ClassChangedParamsSC,EgretRO>('exml/notif/classChangedSC')
}
export interface ClassChangedParamsSC {
    classData:any;
}


export class InitConfigCS {
    public static type: NotificationType<InitConfigParamsCS,EgretRO> =  new NotificationType<InitConfigParamsCS,EgretRO>('exml/notif/initConfigCS')
}
export interface InitConfigParamsCS {
}

export class InitConfigSC {
    public static type: NotificationType<InitConfigParamsSC,EgretRO> = new NotificationType<InitConfigParamsSC,EgretRO>( 'exml/notif/initConfigSC')
}
export interface InitConfigParamsSC {
    classData:any;
}