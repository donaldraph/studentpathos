import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool for student authentication
    this.userPool = new cognito.UserPool(this, 'StudentPathOSUserPool', {
      userPoolName: 'StudentPathOS-Users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false
        },
        givenName: {
          required: true,
          mutable: true
        },
        familyName: {
          required: true,
          mutable: true
        }
      },
      customAttributes: {
        'university': new cognito.StringAttribute({ mutable: true }),
        'student_id': new cognito.StringAttribute({ mutable: true }),
        'verification_status': new cognito.StringAttribute({ mutable: true })
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Verify .edu email domain
    this.userPool.addDomain('StudentPathOSDomain', {
      cognitoDomain: {
        domainPrefix: 'studentpathos'
      }
    });

    // User Pool Client for frontend
    this.userPoolClient = new cognito.UserPoolClient(this, 'StudentPathOSClient', {
      userPool: this.userPool,
      userPoolClientName: 'StudentPathOS-Web-Client',
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: [
          'http://localhost:5173',
          'https://studentpathos.amplifyapp.com'
        ],
        logoutUrls: [
          'http://localhost:5173',
          'https://studentpathos.amplifyapp.com'
        ]
      },
      preventUserExistenceErrors: true
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'StudentPathOS-UserPoolId'
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: 'StudentPathOS-UserPoolClientId'
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `studentpathos.auth.${this.region}.amazoncognito.com`,
      exportName: 'StudentPathOS-UserPoolDomain'
    });
  }
}
