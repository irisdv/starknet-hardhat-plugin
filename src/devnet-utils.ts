import axios, { AxiosResponse, Method } from "axios";

import { StarknetPluginError } from "./starknet-plugin-error";
import { Devnet, HardhatRuntimeEnvironment } from "hardhat/types";

import { Block, L2ToL1Message } from "./starknet-types";
import { REQUEST_TIMEOUT } from "./constants";

interface L1ToL2Message {
    address: string;
    args: {
        from_address: string;
        nonce: number;
        payload: Array<number>;
        selector: string;
        to_address: string;
    };
    block_hash: string;
    block_number: number;
    event: string;
    log_index: number;
    transaction_hash: string;
    transaction_index: number;
}

export interface FlushResponse {
    l1_provider: string;
    consumed_messages: {
        from_l1: Array<L1ToL2Message>;
        from_l2: Array<L2ToL1Message>;
    };
}

export interface LoadL1MessagingContractResponse {
    address: string;
    l1_provider: string;
}

export interface SetTimeResponse {
    next_block_timestamp: number;
}

export interface IncreaseTimeResponse {
    timestamp_increased_by: number;
}

export interface PredeployedAccount {
    initial_balance: number;
    private_key: string;
    public_key: string;
    address: string;
}

export class DevnetUtils implements Devnet {
    private axiosInstance = axios.create({
        baseURL: this.endpoint,
        timeout: REQUEST_TIMEOUT,
        timeoutErrorMessage: "Request timed out"
    });

    constructor(private hre: HardhatRuntimeEnvironment) {}

    private get endpoint() {
        return `${this.hre.starknet.networkConfig.url}`;
    }

    private async requestHandler<T>(
        url: string,
        method: Method,
        data?: unknown
    ): Promise<AxiosResponse> {
        try {
            // Make the request
            return this.axiosInstance.request<T>({
                url,
                method,
                data
            });
        } catch (error) {
            const parent = error instanceof Error && error;
            const msg = `Request failed: Could not ${method} ${url}. This is a Devnet-specific functionality.
Make sure you really want to interact with Devnet and that it is running and available at ${this.endpoint}`;
            throw new StarknetPluginError(msg, parent);
        }
    }

    public async restart() {
        await this.requestHandler<void>("/restart", "POST");
    }

    public async flush() {
        const response = await this.requestHandler<FlushResponse>("/postman/flush", "POST");
        return response.data;
    }

    public async loadL1MessagingContract(networkUrl: string, address?: string, networkId?: string) {
        const body = {
            networkId,
            address,
            networkUrl
        };

        const response = await this.requestHandler<LoadL1MessagingContractResponse>(
            "/postman/load_l1_messaging_contract",
            "POST",
            body
        );
        return response.data;
    }

    public async increaseTime(seconds: number) {
        const response = await this.requestHandler<IncreaseTimeResponse>("/increase_time", "POST", {
            time: seconds
        });
        return response.data;
    }

    public async setTime(seconds: number) {
        const response = await this.requestHandler<SetTimeResponse>("/set_time", "POST", {
            time: seconds
        });
        return response.data;
    }

    public async getPredeployedAccounts() {
        const response = await this.requestHandler<Array<PredeployedAccount>>(
            "/predeployed_accounts",
            "GET"
        );
        return response.data;
    }

    public async dump(path: string) {
        const response = await this.requestHandler<void>("/dump", "POST", {
            path
        });
        return response.data;
    }

    public async load(path: string) {
        const response = await this.requestHandler<void>("/load", "POST", {
            path
        });
        return response.data;
    }

    public async createBlock() {
        const response = await this.requestHandler<Block>("/create_block", "POST");
        return response.data;
    }
}
