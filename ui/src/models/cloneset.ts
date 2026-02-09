
export interface CloneSet {
    apiVersion: string;
    kind: string;
    metadata: {
        name: string;
        namespace: string;
        uid: string;
        resourceVersion: string;
        generation: number;
        creationTimestamp: string;
        labels?: {[key: string]: string};
        annotations?: {[key: string]: string};
    };
    spec: {
        replicas: number;
        selector: {
            matchLabels: {[key: string]: string};
        };
        updateStrategy: {
            type: 'InPlaceIfPossible' | 'Recreate' | 'InPlaceOnly';
            partition?: number | string;
            maxUnavailable?: number | string;
            maxSurge?: number | string;
            paused?: boolean;
            priorityStrategy?: {
                weightPriority?: {
                    value: number;
                    matchSelector: {
                        matchLabels: {[key: string]: string};
                    };
                }[];
                orderPriority?: {
                    orderedKey: string;
                }[];
                scatterStrategy?: {
                    key: string;
                    value: string;
                }[];
            };
        };
        template: {
            metadata: {
                labels?: {[key: string]: string};
            };
            spec: any; // PodSpec
        };
    };
    status: {
        replicas: number;
        readyReplicas: number;
        availableReplicas: number;
        updatedReplicas: number;
        updatedReadyReplicas: number;
        startScheduleTime?: string;
        observedGeneration: number;
        currentRevision: string;
        updateRevision: string;
        collisionCount?: number;
        conditions?: {
            type: string;
            status: 'True' | 'False' | 'Unknown';
            lastTransitionTime: string;
            reason: string;
            message: string;
        }[];
        labelSelector?: string;
    };
}

export interface WorkloadInfo {
    objectMeta: {
        name: string;
        namespace: string;
        labels: {[key: string]: string};
        annotations: {[key: string]: string};
        creationTimestamp: string;
    };
    typeLink: string;
    icon: string;
    status: string;
    images: string[];
    strategy: string;
    step: string;
    setWeight: string;
    actualWeight: string;
    ready: string; // e.g. "1/1"
    containers: string[];
}
