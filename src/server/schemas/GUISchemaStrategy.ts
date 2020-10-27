import {BaseSchemaStrategy} from './BaseSchemaStrategy';
import {ISchemaStrategy} from './ISchemaStrategy';
import {Namespace} from '../sax/Namespace';
import {GUIExmlConfig} from '../exmlConfig/configs';

/**
 * GUI的exml规范策略
 * @author featherJ
 */
export class GUISchemaStrategy extends BaseSchemaStrategy implements ISchemaStrategy {
    /**
     * 工作的命名空间，具体子类重写
     */
    public get guiNS(): Namespace {
        return GUIExmlConfig.GUI;
    }
    /**
     * GUI的命名空间，具体子类重写
     */
    public get workNS(): Namespace {
        return GUIExmlConfig.W;
    }
}
