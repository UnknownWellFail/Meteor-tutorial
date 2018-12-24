import aws from 'aws-sdk';

export let s3 = new aws.S3({ params: { Bucket: process.env.BUCKET } });
export const setS3 = () => {
  s3 = new aws.S3({ params: { Bucket: process.env.BUCKET } });
};

export const getS3 = () => s3;