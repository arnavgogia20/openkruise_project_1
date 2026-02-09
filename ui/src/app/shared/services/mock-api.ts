import { RolloutNamespaceInfo, RolloutRolloutInfo, RolloutRolloutInfoList } from '../../../models/rollout/generated';
import { CloneSet } from '../../../models/cloneset';

export class MockRolloutAPI {
    public async rolloutServiceListRolloutInfos(namespace: string): Promise<RolloutRolloutInfoList> {
        console.log('Mock API: fetching rollouts for namespace', namespace);
        return {
            rollouts: MOCK_CLONESETS.map(cs => this.mapCloneSetToRolloutInfo(cs))
        };
    }

    public async rolloutServiceGetNamespace(): Promise<RolloutNamespaceInfo> {
        return {
            namespace: 'default',
            availableNamespaces: ['default', 'kruise-system']
        };
    }

    public rolloutServiceWatchRolloutInfos(namespace: string) {
        // Return dummy URL to prevent crash, but hooks should handle mock mode
        return { url: '/mock-stream' };
    }
    
    public rolloutServiceWatchRolloutInfo(namespace: string, name: string) {
        return { url: `/mock-stream/${name}` };
    }

    private mapCloneSetToRolloutInfo(cs: CloneSet): RolloutRolloutInfo {
        // Map CloneSet to RolloutInfo structure
        // we use 'any' to bypass strict type checks for prototype fields
        return {
            objectMeta: {
                name: cs.metadata.name,
                namespace: cs.metadata.namespace,
                labels: cs.metadata.labels,
                annotations: cs.metadata.annotations,
                resourceVersion: cs.metadata.resourceVersion,
                creationTimestamp: {
                   seconds: new Date(cs.metadata.creationTimestamp).getTime() / 1000,
                   nanos: 0
                } as any, // Timestamp wrapping
                uid: cs.metadata.uid
            },
            status: {
                ...cs.status,
                // Add fields expected by Rollout UI to avoid crashes if possible
                stableRS: cs.status.currentRevision, // Map current revision as stableish
            } as any, 
            spec: cs.spec as any,
            strategy: cs.spec.updateStrategy.type,
            step: '0',
            setWeight: '0',
            actualWeight: '0',
            ready: `${cs.status.readyReplicas}/${cs.status.replicas}`,
            containers: cs.spec.template.spec.containers.map((c: any) => ({
                name: c.name,
                image: c.image
            })),
            images: cs.spec.template.spec.containers.map((c: any) => c.image),
            // Mock ReplicaSets for revision history
            replicaSets: this.generateMockReplicaSets(cs)
        } as unknown as RolloutRolloutInfo;
    }

    private generateMockReplicaSets(cs: CloneSet): any[] {
        // Generate mock ReplicaSets based on revisions
        const currentRev = cs.status.currentRevision;
        const updateRev = cs.status.updateRevision;
        
        const rss = [];

        // Current Revision (Old/Stable)
        if (currentRev) {
            rss.push({
                objectMeta: {
                    name: `${cs.metadata.name}-${currentRev.substring(0, 5)}`,
                    namespace: cs.metadata.namespace,
                    labels: { ...cs.metadata.labels, 'apps.kruise.io/controller-revision-hash': currentRev },
                    creationTimestamp: { seconds: Date.now()/1000 - 86400 } // 1 day ago
                },
                status: {
                    replicas: cs.status.replicas - cs.status.updatedReplicas,
                    availableReplicas: cs.status.replicas - cs.status.updatedReplicas,
                    readyReplicas: cs.status.replicas - cs.status.updatedReplicas
                },
                revision: 1, // logical revision
                images: cs.spec.template.spec.containers.map((c: any) => c.image), // simplifiction: same image
                pods: [] // Populated in detail view logic if needed
            });
        }

        // Update Revision (New)
        if (updateRev && updateRev !== currentRev) {
             rss.push({
                objectMeta: {
                    name: `${cs.metadata.name}-${updateRev.substring(0, 5)}`,
                    namespace: cs.metadata.namespace,
                    labels: { ...cs.metadata.labels, 'apps.kruise.io/controller-revision-hash': updateRev },
                    creationTimestamp: { seconds: Date.now()/1000 }
                },
                status: {
                    replicas: cs.status.updatedReplicas,
                    availableReplicas: cs.status.updatedReadyReplicas,
                    readyReplicas: cs.status.updatedReadyReplicas
                },
                revision: 2,
                images: cs.spec.template.spec.containers.map((c: any) => c.image),
                pods: []
            });
        }
        
        return rss;
    }
}

const MOCK_CLONESETS: CloneSet[] = [
    {
        apiVersion: 'apps.kruise.io/v1alpha1',
        kind: 'CloneSet',
        metadata: {
            name: 'demo-cloneset-inplace',
            namespace: 'default',
            uid: '123',
            resourceVersion: '100',
            generation: 1,
            creationTimestamp: new Date().toISOString(),
            labels: { app: 'demo' }
        },
        spec: {
            replicas: 5,
            selector: { matchLabels: { app: 'demo' } },
            updateStrategy: {
                type: 'InPlaceIfPossible',
                partition: 0,
                maxUnavailable: '20%'
            },
            template: {
                metadata: { labels: { app: 'demo' } },
                spec: {
                    containers: [{ name: 'nginx', image: 'nginx:1.19.0' }]
                }
            }
        },
        status: {
            replicas: 5,
            readyReplicas: 5,
            availableReplicas: 5,
            updatedReplicas: 2, // 2 Updated, 3 Old
            updatedReadyReplicas: 2,
            observedGeneration: 2,
            currentRevision: 'rev-old-hash',
            updateRevision: 'rev-new-hash',
            conditions: [
                { type: 'Available', status: 'True', lastTransitionTime: new Date().toISOString(), reason: 'MinimumReplicasAvailable', message: 'Deployment has minimum availability.' }
            ]
        }
    },
    {
        apiVersion: 'apps.kruise.io/v1alpha1',
        kind: 'CloneSet',
        metadata: {
            name: 'demo-cloneset-paused',
            namespace: 'default',
            uid: '124',
            resourceVersion: '100',
            generation: 1,
            creationTimestamp: new Date().toISOString(),
            labels: { app: 'demo-paused' }
        },
        spec: {
            replicas: 3,
            selector: { matchLabels: { app: 'demo-paused' } },
            updateStrategy: {
                type: 'Recreate',
                paused: true
            },
            template: {
                metadata: { labels: { app: 'demo-paused' } },
                spec: {
                    containers: [{ name: 'redis', image: 'redis:6.0' }]
                }
            }
        },
        status: {
            replicas: 3,
            readyReplicas: 3,
            availableReplicas: 3,
            updatedReplicas: 0,
            updatedReadyReplicas: 0,
            observedGeneration: 1,
            currentRevision: 'rev-v1',
            updateRevision: 'rev-v2',
            conditions: [
                { type: 'Paused', status: 'True', lastTransitionTime: new Date().toISOString(), reason: 'PausedByUser', message: 'Paused by user.' }
            ]
        }
    }
];
