# Quetzalcoatl_Back-End
Backup of lambda functions from AWS and todo list\
Updated API docs can be found [here](https://docs.google.com/document/d/18y67d3V0MjWw2tiGwqK-8LkG6fQ78yyeiyaRdMhW8jU/edit#heading=h.y03xr5ipv4l1)
# TODO:
API calls needed for the next iteration are **bolded**/
Implement lambda functions for...
- [ ] Venue Manager:
    - [ ] /listBlocks: list the blocks for a show
    - [ ] /createBlock: create a block for a show
    - [x] /deleteBlock: delete a block for a show
    - [ ] **/activateShow: activate a show with a valid configuration**
    - [ ] **/deleteShow: deletes a show if it's inactive**
    - [ ] /getShowReport: generate a report for a single show
- [ ]  Consumer:
    - [x] **/searchShows: returns a lists of shows based on a search query**
    - [ ] **/listActiveShows: lists all active shows in all venues**
    - [ ] **/listAvailableSeats: lists all available seats for a show**
    - [ ] **/purchaseSeats: purchases the seats a consumer has selected if they are all available**
- [ ]  Administrator:
    - [ ] **/getShowsReport: generate a report for all the shows in a venue**
    - [ ] **/deleteShow: deletes a show regardless if it's inactive (same API the one in venue manager, but different functionality)**

There will also probably be some more lambda functions that'll come up as we work on these
