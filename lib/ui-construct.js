const cdk = require("aws-cdk-lib")
const s3 = require("aws-cdk-lib/aws-s3")
const deployment = require("aws-cdk-lib/aws-s3-deployment")
const cloudfront = require("aws-cdk-lib/aws-cloudfront")
const origins = require("aws-cdk-lib/aws-cloudfront-origins")
const acm = require("aws-cdk-lib/aws-certificatemanager")
const route53 = require("aws-cdk-lib/aws-route53")
const targets = require("aws-cdk-lib/aws-route53-targets")
const { Construct } = require("constructs")

/**
 * Create the S3 bucket and distro to host the static site.
 */
class NeptuneUIConstruct extends Construct {
    constructor(scope, id, props) {
        super(scope, id, props)

        // Bucket
        const siteBucket = new s3.Bucket(this, "Website", {
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })
  
        // Output the bucket name
        new cdk.CfnOutput(this, "SiteBucketOut", {
            value: siteBucket.bucketName,
        })
  
        // CloudFront
        const distribution = new cloudfront.Distribution(this, "dist", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new origins.S3Origin(siteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            domainNames: [props.domain],
            certificate: acm.Certificate.fromCertificateArn(this, "site-certificate", props.certificateArn),
        })
  
        // Output the distribution ID and domain name
        new cdk.CfnOutput(this, "DistributionId", {
            value: distribution.distributionId,
        })
        new cdk.CfnOutput(this, "DistributionDomainName", {
            value: distribution.distributionDomainName,
        })

        // Reference the hosted zone (this does not require a context lookup)
        const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.domain + ".",
        })

        // Route53 alias record for the CloudFront distribution
        new route53.ARecord(this, "SiteAliasRecord", {
            recordName: props.domain,
            target: route53.RecordTarget.fromAlias(
                new targets.CloudFrontTarget(distribution)),
            zone,
        })
  
        // Deployment
        new deployment.BucketDeployment(this, "DeployWithInvalidation", {
            sources: [deployment.Source.asset(`web/dist/${props.targetEnv || "dev"}`)],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ["/*"],
            prune: false,
        })

    }
}

module.exports = NeptuneUIConstruct