(require :asdf)
(asdf:load-system :starintel-gserver)

(let* ((request-path (uiop:getenv "QUASAR_REQUEST_PATH"))
       (document-path (uiop:getenv "QUASAR_DOCUMENT_PATH"))
       (text (uiop:read-file-string request-path))
       (request (star.frontends.http-api::parse-json-octets
                 (babel:string-to-octets text :encoding :utf-8)
                 "application/json"))
       (document (star.frontends.http-api::target-v1-document-from-request
                  request "quasar-contract-test"))
       (retry (star.frontends.http-api::target-v1-document-from-request
               request "quasar-contract-test"))
       (other (star.frontends.http-api::target-v1-document-from-request
               request "quasar-other-principal")))
  (assert (string= (jsown:val document "id") (jsown:val retry "id")))
  (assert (not (string= (jsown:val document "id") (jsown:val other "id"))))
  (assert (eq :false (jsown:val document "recurring")))
  (assert (eq :false (jsown:val (jsown:val document "options") "enabled")))
  (assert (eq :null (jsown:val (jsown:val document "options") "empty")))
  (assert (= 9223372036854775808
             (jsown:val (jsown:val document "options") "exact")))
  (star.documents:validate-document document)
  (with-open-file (stream document-path :direction :output
                          :if-exists :supersede :if-does-not-exist :create)
    (write-string (jsown:to-json document) stream)))
