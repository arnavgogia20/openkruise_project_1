import * as React from 'react';
import {RolloutNamespaceInfo, RolloutServiceApi, Configuration} from '../../../models/rollout/generated';

// Get the base path from document.baseURI
// The generated API client already includes /api in its paths, so we just need the base
let cachedBasePath: string | null = null;

const getApiBasePath = (): string => {
    if (cachedBasePath === null) {
        const baseURI = new URL(document.baseURI);
        cachedBasePath = baseURI.pathname.replace(/\/$/, '');
    }
    return cachedBasePath;
};

// Export the base path function for use in other modules
export { getApiBasePath };


const basePath = getApiBasePath();
import { MockRolloutAPI } from '../services/mock-api';
export const USE_MOCK_API = true;
export const RolloutAPI = USE_MOCK_API ? (new MockRolloutAPI() as any) : new RolloutServiceApi(new Configuration({ basePath }));
export const RolloutAPIContext = React.createContext(RolloutAPI);

export const APIProvider = (props: {children: React.ReactNode}) => {
    return <RolloutAPIContext.Provider value={RolloutAPI}>{props.children}</RolloutAPIContext.Provider>;
};

export const NamespaceContext = React.createContext<RolloutNamespaceInfo>({namespace: '', availableNamespaces: []});
