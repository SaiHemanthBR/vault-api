import {Method} from 'axios';
import {RequestConfig, Engine, Dictionary} from '../../types';

const axiosMethod: Dictionary<Method> = {
    read: 'get',
    list: 'get',
    'delete': 'delete',
    write: 'post'
};

export const engine: Engine = function kv(config: RequestConfig): RequestConfig {
    config.requestPath = config.path;
    if (config.method === 'list') { config.requestPath = `${config.requestPath}?list=true`; }
    config.axiosMethod = axiosMethod[config.method];

    return config;
};

export default engine;
