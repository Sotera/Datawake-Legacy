(ns datawake-distributed
(:use     [streamparse.specs])
(:gen-class))

(defn datawake-distributed [options]

[
    ;; spout configuration
    {

        ;; TODO Spouts should be replaced with JVM spouts that can be paralleized

        ;; VISITED
        "datawake-visited-spout" (python-spout-spec
            options
            "datawakestreams.kafka_spouts.KafkaDatawakeVisitedSpout"
            ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
            :p 1
        )


        ;; LOOK AHEAD
        "datawake-lookahead-spout" (python-spout-spec
            options
            "datawakestreams.kafka_spouts.KafkaDatawakeLookaheadSpout"
            ["url", "status", "headers", "flags", "body", "timestamp", "source","context"]
            :p 1
        )


    }

    ;; bolt configuration
    {


        ;; VISITED



        "email-bolt" (python-bolt-spec
                     options
                     {"datawake-visited-spout" :shuffle }
                     "datawakestreams.extractors.email_bolt.EmailBolt"
                     ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                     )

        "phone-bolt" (python-bolt-spec
                     options
                     {"datawake-visited-spout" :shuffle }
                     "datawakestreams.extractors.phone_bolt.PhoneBolt"
                     ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                     )

        "website-bolt" (python-bolt-spec
                       options
                       {"datawake-visited-spout" :shuffle }
                       "datawakestreams.extractors.website_bolt.WebsiteBolt"
                       ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                       )

        "mitie-bolt" (python-bolt-spec
                     options
                     {"datawake-visited-spout" :shuffle }
                     "datawakestreams.extractors.mitie_bolt.MitieBolt"
                     ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                     )

        ;; write extracted links to the crawler-in
        "crawler-queue-writer" (python-bolt-spec
                               options
                               {"website-bolt" :shuffle}
                               "datawakestreams.crawl_queue_writer.CrawlerQueueWriter"
                               []
                               :p 1
                               )

        "domain-writer-bolt" (python-bolt-spec
                             options
                             {"email-bolt" :shuffle
                             "phone-bolt" :shuffle
                             "website-bolt" :shuffle
                             "mitie-bolt" :shuffle}
                             "datawakestreams.domain_writer_bolt.DomainWriterBolt"
                             []
                             :p 1
                             )




        ;; LOOKAHEAD



         "lookahead-email-bolt" (python-bolt-spec
                                options
                                {"datawake-lookahead-spout"  :shuffle }
                                "datawakestreams.extractors.email_bolt.EmailBolt"
                                ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                                )


        "lookahead-phone-bolt" (python-bolt-spec
                               options
                               {"datawake-lookahead-spout"  :shuffle }
                               "datawakestreams.extractors.phone_bolt.PhoneBolt"
                               ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                               )


        "lookahead-website-bolt" (python-bolt-spec
                                 options
                                 {"datawake-lookahead-spout" :shuffle }
                                 "datawakestreams.extractors.website_bolt.WebsiteBolt"
                                 ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                                 )

        "lookahead-mitie-bolt" (python-bolt-spec
                               options
                               {"datawake-lookahead-spout" :shuffle }
                               "datawakestreams.extractors.mitie_bolt.MitieBolt"
                               ["attribute", "value", "extracted_raw", "extracted_metadata","context"]
                               )


        "lookahaed-domain-writer-bolt" (python-bolt-spec
                                       options
                                       {"lookahead-email-bolt" :shuffle
                                       "lookahead-phone-bolt" :shuffle
                                       "lookahead-website-bolt" :shuffle
                                       "lookahead-mitie-bolt" :shuffle }
                                       "datawakestreams.domain_writer_bolt.DomainWriterBolt"
                                       []
                                       :p 1
                                       )



    }

]
)
