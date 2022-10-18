const gptUrl = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
import ADSIZES from "../config/standardSizes";

export default class AdLoader {
    constructor() {

        this.prepareGoogleAsyncApi();

        this.loadGoogleSDK().then(() => {
            this.initGoogleSDK();
        })

        this.addEventListeners();

    }

    private adsLoaded: { [key: string]: boolean } = {};

    private prepareGoogleAsyncApi() {
        window.googletag = (window as any).googletag || {cmd: []};
    }

    private loadGoogleSDK(): Promise<any> {
        return new Promise((resolve, reject) => {
            let r = resolve;
            this.appendScriptToHead(gptUrl).then(() => {
                googletag.cmd.push(function () {
                    //resolve this for signaling gpt sdk is ready
                    r(null);
                })
            });
        })
    }

    private initGoogleSDK() {
        googletag.pubads().enableSingleRequest();
        googletag.enableServices();
    }

    public registerAdSlot(domId: string, path: string) {
        googletag.cmd.push(() => {
            let sizes = this.filterForFittingSizes(domId, ADSIZES);
            let slot = googletag.defineSlot(path, sizes as googletag.MultiSize, domId).addService(googletag.pubads());
            //this is just for showing green boxed preview ads
            slot.setTargeting("adpreview","dev")
            googletag.enableServices();
            //TODO: delay that function call till the element approaches viewport
            this.adsLoaded[domId] = false;
            this.displayAdIfVisible(domId);
        });
    }

    private displayAdIfVisible(domId: string): void {
        if (!this.adsLoaded[domId] && this.checkIsInViewport(domId)) {
            googletag.display(domId);
            this.adsLoaded[domId] = true;
        }
    }

    private addEventListeners(): void {
        const handler = () => {
            for (const domId in this.adsLoaded) {
                this.displayAdIfVisible(domId);
            }
        };
        window.addEventListener('scroll', handler, false);
        window.addEventListener('resize', handler, false); 
    }

    filterForFittingSizes(domId: string, sizes: googletag.GeneralSize): googletag.GeneralSize {
        let fittingSizes: googletag.GeneralSize = [];

        for (let size of sizes) {
            // if Multisize [[300,250],[300,200]]
            if (Array.isArray(size) && this.checkSizeCondition(domId, size)) {
                fittingSizes.push(size);
            }
            // if SingleSize e.g. [300,250]
            else if (!Array.isArray(size) && sizes.length === 2) {
                let singleSize = [sizes[0], sizes[1]] as googletag.SingleSize;
                if (this.checkSizeCondition(domId, singleSize)) {
                    fittingSizes.push(singleSize);
                }
            }
            // NamedSize "fluid" or ["fluid"]
            else if (size === "fluid" || JSON.stringify(size) === JSON.stringify(["fluid"])) {
                fittingSizes.push(size as googletag.NamedSize)
            }
        }
        return fittingSizes;
    }

    checkSizeCondition(domId: string, size: googletag.SingleSize): boolean {
        if (Array.isArray(size) && size.length > 1) {
            let width = document.getElementById(domId)?.offsetWidth;
            let height = document.getElementById(domId)?.offsetHeight;
            if (width && height && size[0] as number <= width && size[1] as number <= height) {
                return true;
            }
        }
        return false;
    }

    checkIsInViewport(domId: string): boolean {
        const vpWidth = window.innerWidth || document.documentElement.clientWidth;
        const vpHeight = window.innerHeight || document.documentElement.clientHeight;
        const element = document.getElementById(domId);
        if (!element) { return false; }
        const { top, left, bottom, right } = element.getBoundingClientRect();
        // return true if one corner of the adslot is within the viewport
        const partiallyVisible =
            (top >= 0 && left >= 0 && top <= vpHeight && left <= vpWidth)
            || (top >= 0 && right >= 0 && top <= vpHeight && right <= vpWidth)
            || (bottom >= 0 && left >= 0 && bottom <= vpHeight && left <= vpWidth)
            || (bottom >= 0 && right >= 0 && bottom <= vpHeight && right <= vpWidth);
        return partiallyVisible;
        // or only return true if element is fully visible 
        // const completelyVisible = top >= 0 && left >= 0 && bottom <= vpHeight && right <= vpWidth;
        // return completelyVisible;
    };

    private appendScriptToHead(scriptSrc: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let s = document.createElement("script");
            s.type = "text/javascript";
            s.src = scriptSrc;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        })
    }
}
