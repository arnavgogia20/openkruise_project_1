import {RolloutRolloutWatchEvent, RolloutServiceApiFetchParamCreator} from '../../../models/rollout/generated';
import {ListState, useLoading, useWatch, useWatchList} from '../utils/watch';
import {RolloutInfo} from '../../../models/rollout/rollout';
import * as React from 'react';
import {NamespaceContext, RolloutAPIContext, getApiBasePath} from '../context/api';
import { notification } from 'antd';

export const useRollouts = (): RolloutInfo[] => {
    const api = React.useContext(RolloutAPIContext);
    const namespaceCtx = React.useContext(NamespaceContext);
    const [rollouts, setRollouts] = React.useState([]);

    React.useEffect(() => {
        const fetchList = async () => {
            try {
                const list = await api.rolloutServiceListRolloutInfos(namespaceCtx.namespace);
                setRollouts(list.rollouts || []);
            } catch (error) {
                console.error('Error fetching rollouts:', error);
                notification.error({
                    message: 'Error fetching rollouts',
                    description: error.message || 'An unexpected error occurred while fetching rollouts.',
                    duration: 8,
                    placement: 'bottomRight',
                });
            }
        };
        fetchList();
    }, [api, namespaceCtx]);

    return rollouts;
};

export const useWatchRollouts = (): ListState<RolloutInfo> => {
    const findRollout = React.useCallback((ri: RolloutInfo, change: RolloutRolloutWatchEvent) => ri.objectMeta.name === change.rolloutInfo?.objectMeta?.name, []);
    const getRollout = React.useCallback((c) => c.rolloutInfo as RolloutInfo, []);
    const namespaceCtx = React.useContext(NamespaceContext);
    const streamUrl = getApiBasePath() + RolloutServiceApiFetchParamCreator().rolloutServiceWatchRolloutInfos(namespaceCtx.namespace).url;

    const init = useRollouts();
    const loading = useLoading(init);

    const [rollouts, setRollouts] = React.useState(init);
    
    // In mock mode, we don't watch, we just use the initial fetch
    const isMock = streamUrl.includes('mock-stream');
    const watchedList = useWatchList<RolloutInfo, RolloutRolloutWatchEvent>(!isMock ? streamUrl : null, findRollout, getRollout, rollouts);
    const finalList = isMock ? rollouts : watchedList;

    React.useEffect(() => {
        setRollouts(init);
    }, [init, loading]);

    return {
        items: finalList,
        loading,
    } as ListState<RolloutInfo>;
};

export const useWatchRollout = (name: string, subscribe: boolean, timeoutAfter?: number, callback?: (ri: RolloutInfo) => void): [RolloutInfo, boolean] => {
    const namespaceCtx = React.useContext(NamespaceContext);
    name = name || '';
    const isEqual = React.useCallback((a, b) => {
        if (!a.objectMeta || !b.objectMeta) {
            return false;
        }

        return JSON.parse(a.objectMeta.resourceVersion) === JSON.parse(b.objectMeta.resourceVersion);
    }, []);
    const streamUrl = getApiBasePath() + RolloutServiceApiFetchParamCreator().rolloutServiceWatchRolloutInfo(namespaceCtx.namespace, name).url;
    const isMock = streamUrl.includes('mock-stream');
    const ri = useWatch<RolloutInfo>(!isMock ? streamUrl : null, subscribe, isEqual, timeoutAfter);
    
    const allRollouts = useRollouts(); // Fetch all for mock lookup
    const mockRi = React.useMemo(() => {
        if (isMock) {
            return allRollouts.find(r => r.objectMeta.name === name) || ({} as RolloutInfo);
        }
        return null;
    }, [allRollouts, name, isMock]);

    if (callback && ri.objectMeta) {
        callback(ri);
    }
    
    const [loading, setLoading] = React.useState(true);
    
    if (isMock) {
        // If mock, return the found item and loading status based on list
        return [mockRi, allRollouts.length === 0]; // simplified loading
    }

    if (ri.objectMeta && loading) {
        setLoading(false);
    }
    return [ri, loading];
};
