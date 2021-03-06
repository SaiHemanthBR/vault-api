import VaultInvalidConfigError from '../helper/invalid-config-error';
import {Config, DefaultConfig, Dictionary, RequestConfig, VaultFunc, VaultResponse} from '../types';
import {postRequest, preRequest} from './engines';

export class Vault {
    private static methodsWithoutData = ['read', 'list', 'delete', 'help'];
    private static methodsWithData = ['write'];

    private defaults: DefaultConfig;

    public vault!: VaultFunc;

    constructor(instanceConfig: DefaultConfig) {
        this.defaults = instanceConfig;

        const vaultFuncs: any = {};

        Vault.methodsWithoutData.forEach((method) => {
            vaultFuncs[method] = async (path: string, config: Dictionary<any>): Promise<any> => {
                return this._vault({...config, method, path});
            };
        });

        Vault.methodsWithData.forEach((method) => {
            vaultFuncs[method] = async (path: string, data: any, config: Dictionary<any>): Promise<any> => {
                return this._vault({...config, method, path, data});
            };
        });

        this.vault = Object.assign(this._vault.bind(this), vaultFuncs);
    }

    private async _vault(config: Config): Promise<VaultResponse> {
        // Merge the config with the defaults
        config = {...this.defaults, ...config};

        // Convert all functional configs to values and sanatize and Validate the configs
        config.path = config.path.replace(/^\//, '').replace(/\/$/, '');
        config.apiVersion = config.apiVersion?.replace(/^\//, '').replace(/\/$/, '');
        config.address = typeof config.address === 'function' ? await config.address(config) : config.address;
        config.address = config.address?.replace(/^\//, '').replace(/\/$/, '');
        config.token = typeof config.token === 'function' ? await config.token(config) : config.token;

        const {axios, address, apiVersion, token, data} = config;

        if (!axios || !address || !apiVersion || !token) {
            throw new VaultInvalidConfigError(config);
        }

        config.engine = typeof config.engine === 'function' ? await config.engine(config) : config.engine;
        const {engine} = config;

        if (!engine) {
            throw new VaultInvalidConfigError(config);
        }

        // Get the request configs
        preRequest(engine, config);

        // Validate the request configs
        const {axiosMethod, requestData} = (config as RequestConfig);
        const requestPath = (config as RequestConfig).requestPath?.replace(/^\//, '').replace(/\/$/, '');

        if (!axiosMethod || !requestPath || (data && !requestData) || (!data && requestData)) {
            throw new VaultInvalidConfigError(config);
        }

        // Send request
        // @ts-ignore Some of the axios methods are not available in the typescript typings
        config.response = await axios({
            method: axiosMethod,
            url: `${address}/${apiVersion}/${requestPath}`,
            headers: {
                'X-Vault-Token': token,
                ...config.headers,
                ...(config.isVaultRequest ? {'X-Vault-Request': 'true'} : {}),
            },
            data: requestData,
        });

        // Return the response
        postRequest(engine, config);
        return config.response;
    }
}
