import aws from 'aws-sdk';

aws.config.update({
  secretAccessKey: Meteor.settings.secretAccessKey,
  accessKeyId: Meteor.settings.accessKeyId,
  region: 'us-east-1',
});

export const s3 = new aws.S3({ params: { Bucket: 'meteor-test-todo-1' } });