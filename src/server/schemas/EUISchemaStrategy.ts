import {BaseSchemaStrategy} from './BaseSchemaStrategy';
import {ISchemaStrategy} from './ISchemaStrategy';
import {Namespace} from '../sax/Namespace';
import {EUIExmlConfig} from '../exmlConfig/configs';

/**
 * GUI的exml规范策略
 * @author featherJ
 */
export class EUISchemaStrategy extends BaseSchemaStrategy implements ISchemaStrategy {
    /**
     * 工作的命名空间，具体子类重写
     */
    public get guiNS(): Namespace {
        return EUIExmlConfig.EUI;
    }
    /**
     * GUI的命名空间，具体子类重写
     */
    public get workNS(): Namespace {
        return EUIExmlConfig.W;
    }
}
