import {Router} from "express";

/**
 *  @interface Controller
 *  @param path - sciezka do kontrolera
 *  @param router - router express
 *  @description interface który reprezentuje to co każdy controller powinien implementować
 */
interface Controller {
    path: string;
    router: Router;
}

export default Controller;