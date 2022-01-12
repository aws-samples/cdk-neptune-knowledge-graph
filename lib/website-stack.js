const cdk = require("aws-cdk-lib")
const NeptuneUIConstruct = require("./ui-construct")

/**
 * This stack creates the static website.
 */
class WebsiteStack extends cdk.Stack {
    /**
     *
     * @param {Construct} scope
     * @param {string} id
     * @param {cdk.StackProps=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props)

        // S3 bucket and distro for the web page
        new NeptuneUIConstruct(this, "ui", {
            domain: props.domain,
            certificateArn: props.certificateArn,
            hostedZoneId: props.hostedZoneId,
        })
    }
}

module.exports = WebsiteStack