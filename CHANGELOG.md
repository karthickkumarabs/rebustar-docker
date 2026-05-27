1. Version - 1.0.0 -> Bug Fixing Changed File Details - @ilakkiya: - 01 -JUL-2025

                        DatabaseController.js(fixed)(settings->dbbackup filename filter issue)
                        QueryBuilder.js (utility country->phone code filter - fixed)
                        OfferController.js(for adding coupon yes or no option is present if no is applied ,save option is not proceeding )-fixed
                        AdminController.js(Utility -> admin table group -> group search not working)-fixed
                        PAymentController.js(Settlement -> balance not working)-fixed(transaction decimal point filter)-fixed , balance - fixed(usertype customer, partner type balance filtr)
                        ServiceModuleController.js(Reports -> Trip payment table -> TRip number not working  - partial filter)-fixed
                        ServiceModuleController.js(Reviews -> Referrence number is not working- partial filter)-fixed
                        updating customer email already exist issue fixed(customercontroller.js)- fixed _id: { $ne: userId }
                        translation controller.js(multilinual partial filter)
                        AdminController.js(Utility -> admin table group -> group normalizes the search input by removing spaces and lowercasing.)


2. Version - 1.0.1 -> Port changed to Dynamically & If Currency is Not Available then take Default currency Changes (Changed File Details)- @yogeshwaran -01 -JUL-2025

                        1. bin/www.js
                        2. config/Appconfig.js
                        3. controller/Auth/Customercontroller -> Create customer function
                        4. controller/Auth/Partnercontroller -> Create Partner function
                        5. controller/ServiceModule/DailyModulecontroller -> create Request function
                        6. controller/ServiceModule/ServiceModulecontroller -> Send Request function
                        7. Model/Auth/Customer.js
                        8. Model/Auth/Partner.js

3. Version - 1.0.2 -> Bidding Amount Upadte with Final Amount - (Changed File Details)- @yogeshwaran -09 -JUL-2025

                         1. controller/ServiceModule/DailyModulecontroller -> getInvoice,getestimation function
                         2. controller/ServiceModule/ServiceModulecontroller -> get estimation function
                         3. models/ServiceModule/Trip.js -> Bidding Param changed Object into Boolean
                         4.modules/Bidding/controllers/BiddingController.js -> updateAmtestimation fare function update bidding Obj
                         5. modules/Socket/BiddingRequest.js - Update Bidding Param changed Object into Boolean

4. Version - 1.0.3 ->  PayStack Payment Gateway Integration - (Changed File Details)- @yogeshwaran -09 -JUL-2025


                         1. modules/payment/Paystack -> Paystack related function and api
                         2. modules/payment/Paymentservice.js -> Merchant transaction function -> To add Paystack gateway changes for subscription Purchase
                         3. modules/Subscription/subscription.js -> once package is active second package no need to purchase Validation added for addpackage function

5. Version - 1.0.4 ->  Multistop Module Integration (Changed file Details) - @Ayyankalai.s

                         1. modules/Multistop -> multistop related apis and controllers and others
                         2. controllers/Notification/Template.js -> To add multi stop notification Content this config file
                         3. controllers/ServiceModule/DailyModuleController.js ->  getInvoice function changes for get multistop pricing at end of trip


6. Version - 1.0.5 ->  Bug Fixing (Changed File Details) - @ilakkiya: - 14 -JUL-2025                     
                         
                         1.Admin total count issue(AdminController.js/getAdmin")
                         2.Language pagination need to handle according to scenario-(TranslationController.js/getLanguages)
                         3.Coupon lising handled if pagination provided show according to it, if not show full data (CouponController.js/getCoupon)
                         4.Reviews - parnter and customer filter get means patch forms show empty data the partner/customer id is not found(ServiceModuleController.js/getReviewDetails)
                         5.utility - country , state ,city update issues(presetController.js/updateCity,updateState,updateCountry)
                         6.Status undefined - 500 issue(RentalController.js/addService)
                         7.site statistics graph issue (Report controller/siteStatistics)

7. Version - 1.0.5 ->  Bug Fixing (Changed File Details) - @ilakkiya: - 14 -JUL-2025  

                         1.Admin total count issue changes(AdminController.js/getAdmin")
                         2.Reviews - parnter and customer filter get means patch forms show empty data the partner/customer id is not found updates (ServiceModuleController.js/getReviewDetails)


8.Version - 1.0.6 -> Dynamic Document module ( changed file details) - @Ayyankalai : 17 -JULY - 2025

                         1. controllers/Creteria/DocumentController.js ( Dynamic Document conditions checked and document details fetched according to admin panel document settings)


9.Version - 1.0.7 -> Bidding Start with Before Estimation Page ( changed file details) -@yogeshwaran: 21 -JULY - 2025


                         1. controllers/Creteria/Pricingcontroller.js - (Bidding Object Added in createPricing and UpdatePricing function)
                         2. controllers/Servicemodule/DailyModulecontroller.js - ( Bidding Obj value Store in CreateRequest function)
                         3. controllers/Servicemodule/Servicemodulecontroller.js - ( list the bidding obj details in getestimation function)
                         4. models/Creteria/Pricing.js - (Bidding Obj added in Models)
                         5. modules/Bidding/config.js - ( Bidding Configuration changed to one status )
                         6. modules/Bidding/controller/biddingcontroller.js - (Bidding issue fixed and Eanble bidding APi function created)
                         7. modules/socket/biddingRequest.js  -> (Bidding Price Taken from pricing Data )


10.Version - 1.0.8 -> PaymentGatewaykey send to App team && Partner QR image Upload Feature ( changed file details) -@yogeshwaran: 25 -JULY - 2025

                        
                         1. controllers/Auth/Customercontroller.js - (Payment gateway key added in get  profile function)

                         2. controllers/Auth/Partnercontroller.js - (Payment gateway key added in get  profile function and add Trip request Sound)

                         3. config/Settings.config.js - QRcode Field Added

                         4. models/Auth/Partner.js - (QR image and upiid field added)

                         5. modules/PartnerSoundQR - new modules added 

                         6. routes/index.js -> router added for new module

                         7. utils/Enum.js -> Partnersoundqrsetting added 



11.Version - 1.0.9 -> Manual Dispatch ( changed file details) -@yogeshwaran: 11 -Aug - 2025

                        
                         1. controllers/Auth/Customercontroller.js - createCustomerinManualdispatch function 

                         2.controllers/servicemodule/Dailycontroller.js - add customer data



12. Version - 1.0.8 ->  Sos Alert settings Integration (changed file details ) -@ayyankalai: Aug 13 2025

                        1.controllers/Auth/AdminController.js - (admin fcm id updated in updateAdmin function)
                        2.controllers/NotificationController.js - ( create notification function changed to accept multiple Notification Sent)
                        3.controllers/DocumentControllers.js - ( document Delete api issues fixed )


13. Version - 1.0.10 ->  Hailtrip + filter issue (Changed File Details) - @Ilakkiya: -12-SEP-2025       

                    
                        1.Modules/Hailtrips/controllers/HailTripController.js - (Hail trip function)
                        2.controllers/Creteria/PricingController.js -(Service type exist issue fixed)
                        3.config/ServiceConfig.js -(Hail ride added)
                        4.controllers/DataStore/ReportController.js-(Filter issue)
                        5.helpers/Function.js-(Hail ride end calculation added)

Version - 1.0.11 -> Subscription + Hailtrip partner discount ( changed file details) - @ Ayyankalai - 23-SEP-2025
                        1.Modules/Controllers/Auth/partnerController.js - (partner online validation based on the subscription package)
                        2.models/Auth/Partner.js - (subscription related fields added)
                        3.Modules/Hailtrips/controllers/HailTripsControllers.js (createHailRideRequest -> partner discount added) (get Pricing  changed for admin subscription commission and partner discount amount)
                        

 14. Version - 1.0.10 ->  MediaSection + SocialLinks + Kilometre based pricing + Added service city validation in pricing  (Changed File Details) - @Ilakkiya: -19-SEP-2025       

                    
                        1.Modules/MediaSettings/controllers/MediaSectionController.js - (Media Section function)
                        2.Modules/MediaSettings/controllers/SocialLinkController.js - (SocialLink function)
                        3.Modules/HailTrips/controllers/HailTripsController.js -(Enable true or false update & get api, Kilometre pricing added in getPricing and getInvoice)
                        4.controllers/ServiceModule/DailyModuleController.js - (Added km based pricing in getPrice and getInvoice function)
                        5.controllers/Creteria/PricingController.js - (Added validation for vehicle and serviceCity)
                  
