/**
 * ---
 * name: upload_images
 * uuid: 39b95974-d4c3-460a-857d-e5eacd080199
 * parent:
 * version: 0
 * owner:
 *   name: Pierre-Henry Frohring
 *   email: pierrehenry.frohring@openmailbox.org
 * satisfy:
 *   - name: images
 *     uuid: 745bf2dc-34b9-4130-af96-0be0c0ac6b07
 *     url:
 *     hash:
 *       val: e7cb01e30b1bba65a8898443c77134aab82dcd37b641aff0ff6b8b32ec3e51db
 *       type: sha256
 *     propositions: [ ]
 * use: [ ]
 * template:
 *   name: class_template
 *   uuid: a779987e-8037-496e-bb00-de6ed9a529cf
 *   version: 0
 *   hash:
 *     val:
 *     type: sha256
 * ---

 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 | def        | Client                                       | Server                                                                                 |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 |            | API                                          |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 |            |                                              |                                                                                        |
 | (def dbc8) | uploadImage : imageFile callback → ø         |                                                                                        |
 |            | ..callback :≡ err success → ø                |                                                                                        |
 |            | ..uploadImageRequest                         |                                                                                        |
 |            | ..&& sendImage(imageFile)                    |                                                                                        |
 |            | ..&& imageUploadSucceeded                    |                                                                                        |
 |            |                                              |                                                                                        |
 | (def bfa7) | getNoteImagesURIs                            | getNoteImagesURIs :≡ userId noteId [nameAndParam] callback → ø                         |
 |            |                                              | ..nameAndparam :≡ { name:String param: { w: ≥ 0 dpr: [1..8] } }                        |
 |            |                                              | ..callback :≡ err [{ name uri }] → ø                                                   |
 |            |                                              | ..computeSecureURI                                                                     |
 |            |                                              |                                                                                        |
 | (def a9d4) | deleteImage                                  | deleteImage :≡ userId noteId name callback → ø                                         |
 |            |                                              | ..callback :≡ err success → ø                                                          |
 |            |                                              | ..rm image from s3 & images                                                            |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 | Inputs     |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 |            |                                              |                                                                                        |
 |            | images : Mongo.Collection                    | images : Mongo.Collection                                                              |
 |            |                                              | ..Store all image refs to s3                                                           |
 |            |                                              |                                                                                        |
 |            | MAX_IMAGE_SIZE : ≥ 0 bytes                   | MAX_IMAGE_SIZE : ≥ 0 bytes                                                             |
 |            |                                              |                                                                                        |
 |            | MAX_IMAGES_PER_USER : ≥ 0                    | MAX_IMAGES_PER_USER : ≥ 0                                                              |
 |            |                                              |                                                                                        |
 |            |                                              | AWS_CONFIGS :≡                                                                         |
 |            |                                              | ..AWS_CONFIG :≡ { accessKeyId secretAccessKey region maxRetries }                      |
 |            |                                              | ..{                                                                                    |
 |            |                                              | ....'imageUser': AWS_CONFIG                                                            |
 |            |                                              | ...., 'imageAdmin': AWS_CONFIG                                                         |
 |            |                                              | ...., 'bucket': String                                                                 |
 |            |                                              | ...., 'region': String                                                                 |
 |            |                                              | ..}                                                                                    |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              | IMGIX_CONFIG :≡ { 'domain': String, 'secureURLToken': String }                         |
 |            |                                              |                                                                                        |
 |            |                                              | TRANSACTION_TIMEOUT : > 0 millisec                                                     |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 | Invariants |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 |            |                                              |                                                                                        |
 |            |                                              | client uploaded to s3 ∨ got an image from Imgix ⇒ client has been authorized by server |
 |            |                                              |                                                                                        |
 |            |                                              | ∀ imageDoc ∈ images: imageDoc 1--1 imageS3                                             |
 |            |                                              |                                                                                        |
 |            |                                              | size(user.images) < MAX_IMAGES_PER_USER x MAX_IMAGE_SIZE                               |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 | Internals  |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|
 |            |                                              |                                                                                        |
 | (def ade2) |                                              | imageInsertions = { }                                                                  |
 |            |                                              | ..Elements of imageInsertions track transactions state between client/server.          |
 |            |                                              | ..If client takes too long/fails to upload to s3 ⇒ don't update images                 |
 |            |                                              |                                                                                        |
 | (def ec28) |                                              | scheduleImageInsertionAbort :≡ url → insertImage.abort                                 |
 |            |                                              | ..rm image at url if any                                                               |
 |            |                                              | ..rm imageDoc[url] if any                                                              |
 |            |                                              |                                                                                        |
 | (def be78) | uploadImageRequest                           | uploadImageRequest :≡ imageFile callback → ø                                           |
 |            |                                              | ..callback :≡ err { signedRequest, url } → ø                                           |
 |            |                                              | ..provided user can upload:                                                            |
 |            |                                              | ....imageInsertions[url] = { abort: scheduleImageInsertionAbort(url), doc: imageDoc }  |
 |            |                                              | ....return { signedRequest, url } unless upload error.                                 |
 |            |                                              | ..else:                                                                                |
 |            |                                              | ....return error with code: 'UploadImageFailed:ImagesLimitExceeded'                    |
 |            |                                              |                                                                                        |
 | (def 7469) | sendImage :≡ file signedRequest callback → ø |                                                                                        |
 |            | ..callback :≡ err success → ø                |                                                                                        |
 |            | ..upload imageFile at url                    |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 | (def 1ee3) | imageUploadSucceeded                         | imageUploadSucceeded :≡ url → ø                                                        |
 |            |                                              | ..∃ imgI ≡ imageInsertions[url]:                                                       |
 |            |                                              | ....images = images ∪ { imgI.doc }                                                     |
 |            |                                              | ....clear imgI.abort                                                                   |
 |            |                                              | ....delete imgI                                                                        |
 |            |                                              | ..∄ imgI: wait for imgI.abort()                                                        |
 |            |                                              |                                                                                        |
 | (def e99d) |                                              | computeSecureURI :≡ given appropriate params, ask Imgix for a secured request          |
 |            |                                              | (that cannot be changed mid-air)                                                       |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |            |                                              |                                                                                        |
 |------------+----------------------------------------------+----------------------------------------------------------------------------------------|

 */




/*global Meteor, Template, Mongo, AWS, Match, check, R, ReactiveVar, imgixCore */
/*eslint no-alert: 0, no-console: 0*/



/** Inputs */

const AWS_CONFIGS_INPUT = Meteor.isServer ? Meteor.settings.AWS : null;
const IMGIX_CONFIG_INPUT = Meteor.isServer ? Meteor.settings.IMGIX : null;
const TRANSACTION_TIMEOUT_INPUT = 30000;
const MAX_IMAGES_PER_USER_INPUT = 1;
const MAX_IMAGE_SIZE_INPUT = 4 * Math.pow(10, 6);
const images_input = new Mongo.Collection('images');



/** Implementation */

const merge = R.merge;
const map = R.map;
const equals = R.equals;


const USER_ID = 'marc';
const NOTE_ID = new Mongo.ObjectID('102941863db6cb7f4aa9a85b');



const validate = (value, pattern) => !check(value, pattern) && value;



const images = validate(images_input, Mongo.Collection);



const integerSet =
          {
              'isMember': null
              , 'predicate': null
              , 'pattern': Match.Where((function () {
                  return Number.isInteger || (n => !check(n, Number) && isFinite(n) && Math.floor(n) === n);
              }()))
          };



const naturalSet =
          {
              'isMember': null
              , 'predicate': null
              , 'pattern': Match.Where(n => !check(n, integerSet.pattern) && n > -1)
          };



const posNaturalSet =
          {
              'isMember': null
              , 'predicate': null
              , 'pattern': Match.Where(n => !check(n, naturalSet.pattern) && n > 0)
          };



const MAX_IMAGE_SIZE = validate(MAX_IMAGE_SIZE_INPUT, naturalSet.pattern);



const imageFileSet =
          (function (size) {
              return {
                  'isMember': null
                  , 'predicate': null
                  , 'pattern': {
                      'userId': String
                      , 'noteId': Mongo.ObjectID
                      , 'name': Match.Where(o => /[a-zA-Z0-9_.-]+/.test(o))
                      , 'type': Match.OneOf('image/jpeg', 'image/png')
                      , 'size': Match.Where(o => !check(o, posNaturalSet.pattern) && o < validate(size, naturalSet.pattern))
                  }
              };
          }(MAX_IMAGE_SIZE));



const imageResourceSet =
          (function (imageFileSet) {
              return {
                  'isMember': null
                  , 'predicate': null
                  , 'pattern': { 'name': imageFileSet.pattern.name, 'uri': String }
              };
          }(imageFileSet));



const imageDocSet =
          (function (imageFileSet) {
              return {
                  'isMember': null
                  , 'predicate': null
                  , 'pattern': merge(imageFileSet.pattern, { 'url': String, '_id': Mongo.ObjectID })
              };
          }(imageFileSet));



const imageInsertionSet =
          (function (imageDocSet) {
              const p = { 'abort': Match.Any, 'doc': imageDocSet.pattern };
              return {
                  'isMember': null
                  , 'predicate': null
                  , 'pattern': p
                  , 'build': (abort, doc) => ({ 'abort': validate(abort, p.abort), 'doc': validate(doc, p.doc) })
              };
          }(imageDocSet));



const AWSConfigsSet =
          (function () {
              const AWSConfigPattern =
                        {
                            'accessKeyId': String
                            , 'secretAccessKey': String
                            , 'region': String
                            , 'maxRetries': posNaturalSet.pattern
                        };

              return {
                  'isMember': null
                  , 'predicate': null
                  , 'pattern': {
                      'imageUser': AWSConfigPattern
                      , 'imageAdmin': AWSConfigPattern
                      , 'bucket': String
                      , 'region': String
                  }
              };
          }());



const IMGIXConfigSet =
          {
              'isMember': null
              , 'predicate': null
              , 'pattern': {
                  'domain': String
                  , 'secureURLToken': String
              }
          };



if (Meteor.isServer) {

    const AWS_CONFIGS = validate(AWS_CONFIGS_INPUT, AWSConfigsSet.pattern);
    const IMGIX_CONFIG = validate(IMGIX_CONFIG_INPUT, IMGIXConfigSet.pattern);
    const TRANSACTION_TIMEOUT = validate(TRANSACTION_TIMEOUT_INPUT, posNaturalSet.pattern);
    const MAX_IMAGES_PER_USER = validate(MAX_IMAGES_PER_USER_INPUT, naturalSet.pattern);



    const imgixClient = new imgixCore.Client(IMGIX_CONFIG.domain, IMGIX_CONFIG.secureURLToken);



    // (ref ade2)
    const imageInsertions = {};



    const buildS3ImageKey = (userId, noteId, name) => {
        return `${validate(userId, String)}/${validate(noteId, Mongo.ObjectID).toHexString()}/${validate(name, String)}`;
    };



    const buildDeleteObjectRequest = (function (cred) {
        return () => {
            const s3 = new AWS.S3(cred);
            return Meteor.wrapAsync(s3.deleteObject, s3);
        };
    }(AWS_CONFIGS.imageAdmin));



    // (ref ec28)
    const scheduleImageInsertionAbort = (url, S3ImageKey) =>
              Meteor.setTimeout(
                  () => {
                      try {
                          buildDeleteObjectRequest()({
                              'Bucket': AWS_CONFIGS.bucket
                              , 'Key': S3ImageKey
                          });
                      }
                      catch (e) {
                          console.log(e);
                          throw e;
                      }

                      delete imageInsertions[url];
                  }
                  , TRANSACTION_TIMEOUT);



    Meteor.methods(
        {
            // (ref be78)
            'uploadImageRequest': function (imageFile) {

                check(imageFile, imageFileSet.pattern);
                imageFile.userId = this.userId || USER_ID;

                if (images.find({ 'userId': imageFile.userId }).count() < MAX_IMAGES_PER_USER) {

                    const s3 = new AWS.S3(AWS_CONFIGS.imageUser);
                    const getSignedUrl = Meteor.wrapAsync(s3.getSignedUrl, s3);

                    // imageFile.userId ∨ imageFile.noteId.toHexString() are alphanumeric strings: no '/'
                    // see: MongoID._looksLikeObjectID: str.match(/^[0-9a-f]*$/)
                    const S3ImageKey = buildS3ImageKey(imageFile.userId, imageFile.noteId, imageFile.name);
                    const url = `https://${AWS_CONFIGS.bucket}.s3.amazonaws.com/${S3ImageKey}`;
                    var signedRequest = null;

                    try {
                        signedRequest =
                            getSignedUrl(
                                'putObject'
                                , {
                                    'Bucket': AWS_CONFIGS.bucket
                                    , 'Key': S3ImageKey
                                    , 'Expires': 60 // seconds
                                    , 'ContentType': imageFile.type
                                    , 'ACL': 'public-read'
                                }
                            );
                    }
                    catch(e) {
                        console.log(e);
                        throw e;
                    }

                    imageInsertions[url] = ((imageFile, url, S3ImageKey) => {
                        return imageInsertionSet.build(
                            scheduleImageInsertionAbort(url, S3ImageKey)
                            , merge(imageFile, { url, '_id': new Mongo.ObjectID() })
                        );
                    })(imageFile, url, S3ImageKey);

                    return { signedRequest, url };
                }
                else {
                    throw new Meteor.Error('UploadImageFailed:ImagesLimitExceeded', 'Too many images associated with this account', '');
                }
            }



            // (ref 1ee3)
            , 'imageUploadSucceeded': (url) => {

                const loadingImage = imageInsertions[url];

                if (loadingImage) {
                    const doc = loadingImage.doc;
                    Meteor.clearTimeout(loadingImage.abort);
                    images.insert(!check(doc, imageDocSet.pattern) && doc);
                }

                delete imageInsertions[url];
            }



            // (ref bfa7)
            , 'getNoteImagesURIs': (userId, noteId, namesAndParams) => {
                check(userId, String);
                check(noteId, Mongo.ObjectID);
                check(namesAndParams, [{ 'name': imageFileSet.pattern.name
                                         , 'param': {
                                             'w': posNaturalSet.pattern // in CSS pixel, provided viewport is configured.
                                             , 'dpr': Match.Where(o => !check(o, posNaturalSet.pattern) && o < 9)
                                         }
                                       }]);

                // (ref e99d) userId noteId imgSpec → secureUri:String
                const computeSecureURI = (imgSpec) => imgixClient.path(buildS3ImageKey(userId, noteId, imgSpec.name)).toUrl(imgSpec.param).toString();

                return map((imgSpec) => ({ 'name': imgSpec.name, 'uri': computeSecureURI(imgSpec) }), namesAndParams);
            }



            // (ref a9d4)
            , 'deleteImage': (userId, noteId, name) => {
                check(userId, String);
                userId = this.userId || USER_ID;
                check(noteId, Mongo.ObjectID);
                check(name, String);

                try {
                    buildDeleteObjectRequest()({
                        'Bucket': AWS_CONFIGS.bucket
                        , 'Key': buildS3ImageKey(userId, noteId, name)
                    });
                }
                catch (e) {
                    console.log(e);
                    throw e;
                }

                images.remove(
                    { 'userId': userId, 'noteId': noteId, 'name': name }
                    , (err) => { if (err) { throw err; } }
                );
            }
        }
    );
}



if (Meteor.isClient) {

    // (ref 7469)
    const sendImage = (file, signedRequest, cb /* err:Object, success:True → ø */) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedRequest);
        xhr.setRequestHeader('x-amz-acl', 'public-read');
        xhr.onload = (evt) => {

            const req = evt.currentTarget;
            if (req.status === 200) { cb(null, true); }
            else { cb({ 'message': `status: ${req.status}, statusText: ${req.statusText}` }, null); }

        };
        xhr.onerror = (err) => cb(err, null);
        xhr.send(file);
    };



    // (ref dbc8)
    const uploadImage = (imageFile) => {
        Meteor.call(
            'uploadImageRequest'
            , { 'noteId': NOTE_ID, 'userId': USER_ID, 'name': imageFile.name, 'type': imageFile.type, 'size': imageFile.size }
            , (err, reply) => {

                if (err) { console.log(`err: ${err}`); }
                else {
                    sendImage(
                        imageFile
                        , reply.signedRequest
                        , (err) => { err ? console.log(err) : Meteor.call('imageUploadSucceeded', reply.url); });
                }
            });
    };



    Template.body.onCreated(function () {
        const self = this;
        self.imagesResources = new ReactiveVar([], (a, b) => equals(a, !check(b, [imageResourceSet.pattern]) && b));


        self.autorun(() => {
            Meteor.call(
                'getNoteImagesURIs'
                , USER_ID
                , NOTE_ID
                , map((imageDoc) => ({ 'name': imageDoc.name, 'param': { 'w': 300, 'dpr': window.devicePixelRatio } }), images.find({}).fetch())
                , (err, imagesResources) => err ? alert(err) : self.imagesResources.set(imagesResources));
        });
    });



    Template.body.events(
        {
            'change #input': (evt) => {
                const input = evt.target;
                const imageFile = input.files[0];
                const reader = new FileReader();

                uploadImage(imageFile);

                // Render thumbnail
                reader.onload =

                    // Keep imageFile for thumbnail
                    (input, iFile =>

                     e => {
                         const div = document.createElement('div');
                         div.innerHTML = `<img class="thumb" src="${e.target.result}" title="${escape(iFile.name)}" width="200px"/>`;
                         document.getElementById('list').insertBefore(div, null);

                         // Else upload twice same file => change event doesn't fire.
                         input.value = null;
                     }

                    )(input, imageFile);
                reader.readAsDataURL(imageFile);
            }
        });



    Template.body.helpers({ 'imagesResources': () => map(merge({ 'userId': USER_ID, 'noteId': NOTE_ID }), Template.instance().imagesResources.get()) });



    Template.displayImage.events({
        'click button': (evt, tpt) => {
            const d = tpt.data;

            Meteor.call(
                'deleteImage'
                , d.userId
                , d.noteId
                , d.name
                , (err) => err && console.log(err)
            );
        }
    });

}
