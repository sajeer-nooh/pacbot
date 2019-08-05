/*
 *Copyright 2018 T Mobile, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); You may not use
 * this file except in compliance with the License. A copy of the License is located at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * or in the "license" file accompanying this file. This file is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or
 * implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*** Created by puneetbaser on 29/01/18. */

import { Injectable } from '@angular/core';
import { LoggerService } from '../../shared/services/logger.service';
import { DataCacheService } from './data-cache.service';
import { RouterUtilityService } from '../../shared/services/router-utility.service';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable()
export class WorkflowService {

    constructor(

        private logger: LoggerService,
        private dataStore: DataCacheService,
        private routerUtilityService: RouterUtilityService,
        private router: Router,

    ) {}

    private level = {};
    /* This would track which page user has clicked in a module */
    private trackOpenedPageInAModule = {};

    addRouterSnapshotToLevel(routerSnapshot: ActivatedRouteSnapshot, currentLevel: number= 0) {

        const urlPath = this.routerUtilityService.getFullUrlFromSnapshopt(routerSnapshot);

        const queryParams = this.routerUtilityService.getQueryParametersFromSnapshot(routerSnapshot);

        this.level = this.getDetailsFromStorage();

        const obj = {
            'url': urlPath,
            'queryParams': queryParams
        };
        if (!this.level['level' + currentLevel]) {
            this.level['level' + currentLevel] = [];
        }
        this.level['level' + currentLevel].push(obj);
        this.saveToStorage(this.level);
    }

    goBackToLastOpenedPageAndUpdateLevel(currentRouterSnapshot: ActivatedRouteSnapshot, targetIndex?: number, currentLevel?: number) {
        if (currentLevel === undefined) {
            currentLevel = this.routerUtilityService.getpageLevel(currentRouterSnapshot);
        }
        if (!(this.level[currentLevel] && this.level[currentLevel].length > 0)) {
            return;
        }

        let destinationUrlAndParams;

        this.level = this.getDetailsFromStorage();

        if (targetIndex === undefined) {
            targetIndex = this.level[currentLevel].length - 1;
        }

        destinationUrlAndParams = this.level[currentLevel].splice(targetIndex)[0];

        /* Not required. As now we need to go back only in the same level. */
        /* while (!destinationUrlAndParams && currentLevel >= 0) {
            if ( this.level[currentLevel] && this.level[currentLevel].length > 0 ) {
                destinationUrlAndParams = this.level[currentLevel].pop();
                break;
            }
            currentLevel--;
        } */
        this.saveToStorage(this.level); // <-- update session storage after poping each obj

        const currentPageQueryParams = this.routerUtilityService.getQueryParametersFromSnapshot(currentRouterSnapshot);

        const agAndDomain = {};
        agAndDomain['ag'] = currentPageQueryParams['ag'];
        agAndDomain['domain'] = currentPageQueryParams['domain'];

        Object.assign(destinationUrlAndParams.queryParams, agAndDomain);

        let urlToBeNavigatedTo = destinationUrlAndParams.url;
        let newUrlQueryParam = '';

        Object.keys(destinationUrlAndParams.queryParams).forEach((key, keyIndex) => {
            newUrlQueryParam += key + '=' + encodeURIComponent(destinationUrlAndParams.queryParams[key]) + '&';
        });
        newUrlQueryParam = newUrlQueryParam.slice(0, -1);

        if (newUrlQueryParam !== '') {
            urlToBeNavigatedTo += '?' + newUrlQueryParam;
        }

        this.router.navigateByUrl(urlToBeNavigatedTo).then(result => {
            this.logger.log('info', 'successful navigation - ' + result);
        })
        .catch(error => {
            this.logger.log('error', 'navigation error - ' + error);
        });
    }

    clearAllLevels() {
        this.level = {};
        this.saveToStorage(this.level);
    }

    clearSpecificLevel(levelToBeCleared) {
        this.level['level' + levelToBeCleared] = [];
    }
    /**
     * Added By Trinanjan
     * saveToStorage() saves the current url to seesion storage
     * getDetailsFromStorage() gets the previous page url
     * These 2 functions are added so that user can go back even if they reload the page
     */
    saveToStorage(level) {
        try {
            const levelToBeStroed = JSON.stringify(level);
        this.dataStore.set('StoredLevel' , levelToBeStroed);
        } catch (error) {
            this.logger.log('error', error);
        }

    }
    getDetailsFromStorage() {
        try {
            let levelToBeRetrived = this.dataStore.get('StoredLevel');
            if ( levelToBeRetrived !== undefined) {
                levelToBeRetrived = JSON.parse(levelToBeRetrived);
            } else {
                levelToBeRetrived = {};
            }
            return levelToBeRetrived;
        } catch (error) {
            this.logger.log('error', error);
        }
    }

    /** Below functions are used to get previously opened page in a particular module **/

    addPageToModuleTracker(moduleName, pageUrl) {
        this.trackOpenedPageInAModule[moduleName] = pageUrl;
    }

    addQueryParamsToModuleTracker(moduleName, queryParamString) {
        if (queryParamString) {
            this.trackOpenedPageInAModule[moduleName + 'queryparams'] = queryParamString;
        }
    }

    getPreviouslyOpenedPageInModule(moduleName) {
        return this.trackOpenedPageInAModule[moduleName];
    }

    getPreviouslyOpenedPageQueryParamsInModule(moduleName) {
        return this.trackOpenedPageInAModule[moduleName + 'queryparams'];
    }

    clearDataOfOpenedPageInModule() {
        this.trackOpenedPageInAModule = {};
    }
    checkIfFlowExistsCurrently(currentLevel?) {

        const currentPageLevelNumber = this.routerUtilityService.getpageLevel(this.router.routerState.snapshot.root);

        let flowExiststatus = false;
        this.level = this.getDetailsFromStorage();
        if (this.level[currentPageLevelNumber]) {
            flowExiststatus = this.level[currentPageLevelNumber].length > 0;
        }

        return flowExiststatus;
    }
}
