const cdk = require("aws-cdk-lib")
const ec2 = require("aws-cdk-lib/aws-ec2")
const NeptuneClusterConstruct = require("./cluster-construct")
const NeptuneApiConstruct = require("./api-construct")
const s3 = require("aws-cdk-lib/aws-s3")

/**
 * This stack creates the vpc, Neptune cluster, static website, 
 * and REST API.
 */
class NeptuneStack extends cdk.Stack {
    /**
     *
     * @param {Construct} scope
     * @param {string} id
     * @param {cdk.StackProps=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props)

        // VPC
        const vpc = new ec2.Vpc(this, "vpc")

        // Neptune cluster
        const cc = new NeptuneClusterConstruct(this, "cluster", {
            vpc,
        })

        this.vpc = vpc
        this.cluster = cc.cluster
        this.clusterSecurityGroup = cc.clusterSecurityGroup

        // Export bucket for snapshots of the data.
        // Also used for importing user graphs into Neptune
        const exportBucket = new s3.Bucket(this, "exports", {
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.OPTIONS,
                    ],
                    allowedOrigins: [props.domain],
                    allowedHeaders: ["*"],
                },
            ],
        })

        // Lambda rest api to access the data
        new NeptuneApiConstruct(this, "graph-api", {
            cluster: this.cluster,
            vpc: this.vpc,
            clusterSecurityGroup: this.clusterSecurityGroup,
            userPool: props.userPool,
            cognitoRedirectUri: props.cognitoRedirectUri,
            cognitoDomainPrefix: props.cognitoDomainPrefix,
            cognitoAppClientId: props.cognitoAppClientId,
            cognitoRegion: props.cognitoRegion,
            cognitoPoolId: props.cognitoPoolId,
            exportBucket,
        })
    }
}

module.exports = NeptuneStack 
