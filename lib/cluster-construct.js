const cdk = require("aws-cdk-lib")
const neptune = require("@aws-cdk/aws-neptune-alpha")
const ec2 = require("aws-cdk-lib/aws-ec2")
const { Construct } = require("constructs")

/**
 * Creates the Neptune database cluster to store the graph.
 */
class NeptuneClusterConstruct extends Construct {
    constructor(scope, id, props) {
        super(scope, id, props)

        const clusterParameterGroup = new neptune.ClusterParameterGroup(this,
            "ClusterParams", 
            {
                description: "Cluster parameter group",
                parameters: {
                    neptune_enable_audit_log: "1",
                },
            },
        )

        const parameterGroup = new neptune.ParameterGroup(this, "DbParams", {
            description: "Db parameter group",
            parameters: {
                neptune_query_timeout: "10000",
            },
        })

        this.clusterSecurityGroup = new ec2.SecurityGroup(this, "ClusterSG", {
            vpc: props.vpc, 
            description: "Knowledge Graph Neptune Security Group",
        })

        // Create the cluster
        this.cluster = new neptune.DatabaseCluster(this, "cluster", {
            vpc: props.vpc,
            instanceType: neptune.InstanceType.T3_MEDIUM,
            clusterParameterGroup,
            parameterGroup,
            backupRetention: cdk.Duration.days(7),
            deletionProtection: true,
            securityGroups: [this.clusterSecurityGroup],
        })

        // Output the writer endpoint host:port
        new cdk.CfnOutput(this, "WriteEndpointOutput", {
            value: this.cluster.clusterEndpoint.socketAddress,
        })
    }
}

module.exports = NeptuneClusterConstruct