/**
* Class used to load GUI via XML.
*/
var GUILoader = /** @class */ (function () {
    function GUILoader(
    /** Sets the class context. Used when the loader is instanced inside a class and not in a global context */
    parentClass) {
        if (parentClass === void 0) { parentClass = null; }
        this._nodes = {};
        this._nodeTypes = {
            element: 1,
            attribute: 2,
            text: 3
        };
        this._isLoaded = false;
        this._objectAttributes = {
            "textHorizontalAlignment": 1,
            "textVerticalAlignment": 2,
            "horizontalAlignment": 3,
            "verticalAlignment": 4,
            "stretch": 5,
        };
        if (parentClass) {
            this._parentClass = parentClass;
        }
    }
    GUILoader.prototype._getChainElement = function (attributeValue, isGlobal) {
        if (isGlobal === void 0) { isGlobal = false; }
        var element = window;
        if (this._parentClass && !isGlobal) {
            element = this._parentClass;
        }
        var value = attributeValue;
        value = value.split(".");
        for (var i = 0; i < value.length; i++) {
            element = element[value[i]];
        }
        return element;
    };
    GUILoader.prototype._createGuiElement = function (node, parent, linkParent) {
        if (linkParent === void 0) { linkParent = true; }
        try {
            var className = this._getChainElement("BABYLON.GUI." + node.nodeName, true);
            var guiNode = new className();
            if (parent && linkParent) {
                parent.addControl(guiNode);
            }
            for (var i = 0; i < node.attributes.length; i++) {
                if (node.attributes[i].name.toLowerCase().includes("datasource")) {
                    continue;
                }
                if (node.attributes[i].name.toLowerCase().includes("observable")) {
                    var element = this._getChainElement(node.attributes[i].value);
                    guiNode[node.attributes[i].name].add(element);
                    continue;
                }
                else if (node.attributes[i].name == "linkWithMesh") {
                    if (this._parentClass) {
                        guiNode.linkWithMesh(this._parentClass[node.attributes[i].value]);
                    }
                    else {
                        guiNode.linkWithMesh(window[node.attributes[i].value]);
                    }
                }
                else if (node.attributes[i].value.startsWith("{{") && node.attributes[i].value.endsWith("}}")) {
                    var element = this._getChainElement(node.attributes[i].value.substring(2, node.attributes[i].value.length - 2));
                    guiNode[node.attributes[i].name] = element;
                }
                else if (!this._objectAttributes[node.attributes[i].name]) {
                    if (node.attributes[i].value == "true" || node.attributes[i].value == "false") {
                        guiNode[node.attributes[i].name] = (node.attributes[i].value == 'true');
                    }
                    else {
                        guiNode[node.attributes[i].name] = !isNaN(Number(node.attributes[i].value)) ? Number(node.attributes[i].value) : node.attributes[i].value;
                    }
                }
                else {
                    guiNode[node.attributes[i].name] = this._getChainElement("BABYLON.GUI." + node.attributes[i].value, true);
                }
            }
            if (!node.attributes.getNamedItem("id")) {
                this._nodes[node.nodeName + Object.keys(this._nodes).length + "_gen"] = guiNode;
                return guiNode;
            }
            if (!this._nodes[node.attributes.getNamedItem("id").nodeValue]) {
                this._nodes[node.attributes.getNamedItem("id").nodeValue] = guiNode;
            }
            else {
                throw "GUILoader Exception : Duplicate ID, every element should have an unique ID attribute";
            }
            return guiNode;
        }
        catch (e) {
            throw "GUILoader Exception : Error parsing Control " + node.nodeName + "," + e + ".";
        }
    };
    GUILoader.prototype._parseGrid = function (node, guiNode, parent) {
        var width;
        var height;
        var columns;
        var rows = node.children;
        var cells;
        var isPixel = false;
        var cellNode;
        var rowNumber = -1;
        var columnNumber = -1;
        var totalColumnsNumber = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].nodeType != this._nodeTypes.element) {
                continue;
            }
            if (rows[i].nodeName != "Row") {
                throw "GUILoader Exception : Expecting Row node, received " + rows[i].nodeName;
            }
            rowNumber += 1;
            columns = rows[i].children;
            if (!rows[i].attributes.getNamedItem("height")) {
                throw "GUILoader Exception : Height must be defined for grid rows";
            }
            height = Number(rows[i].attributes.getNamedItem("height").nodeValue);
            isPixel = rows[i].attributes.getNamedItem("isPixel") ? JSON.parse(rows[i].attributes.getNamedItem("isPixel").nodeValue) : false;
            guiNode.addRowDefinition(height, isPixel);
            for (var j = 0; j < columns.length; j++) {
                if (columns[j].nodeType != this._nodeTypes.element) {
                    continue;
                }
                if (columns[j].nodeName != "Column") {
                    throw "GUILoader Exception : Expecting Column node, received " + columns[j].nodeName;
                }
                columnNumber += 1;
                if (rowNumber > 0 && columnNumber > totalColumnsNumber) {
                    throw "GUILoader Exception : In the Grid element, the number of columns is defined in the first row, do not add more columns in the subsequent rows.";
                }
                if (rowNumber == 0) {
                    if (!columns[j].attributes.getNamedItem("width")) {
                        throw "GUILoader Exception : Width must be defined for all the grid columns in the first row";
                    }
                    width = Number(columns[j].attributes.getNamedItem("width").nodeValue);
                    isPixel = columns[j].attributes.getNamedItem("isPixel") ? JSON.parse(columns[j].attributes.getNamedItem("isPixel").nodeValue) : false;
                    guiNode.addColumnDefinition(width, isPixel);
                }
                cells = columns[j].children;
                for (var k = 0; k < cells.length; k++) {
                    if (cells[k].nodeType != this._nodeTypes.element) {
                        continue;
                    }
                    cellNode = this._createGuiElement(cells[k], guiNode, false);
                    guiNode.addControl(cellNode, rowNumber, columnNumber);
                    if (cells[k].firstChild) {
                        this._parseXml(cells[k].firstChild, cellNode);
                    }
                }
            }
            if (rowNumber == 0) {
                totalColumnsNumber = columnNumber;
            }
            columnNumber = -1;
        }
        if (node.nextSibling) {
            this._parseXml(node.nextSibling, parent);
        }
    };
    GUILoader.prototype._parseElement = function (node, guiNode, parent) {
        if (node.firstChild) {
            this._parseXml(node.firstChild, guiNode);
        }
        if (node.nextSibling) {
            this._parseXml(node.nextSibling, parent);
        }
    };
    GUILoader.prototype._prepareSourceElement = function (node, guiNode, variable, source, iterator) {
        if (this._parentClass) {
            this._parentClass[variable] = source[iterator];
        }
        else {
            window[variable] = source[iterator];
        }
        if (node.firstChild) {
            this._parseXml(node.firstChild, guiNode, true);
        }
    };
    GUILoader.prototype._parseElementsFromSource = function (node, guiNode, parent) {
        var dataSource = node.attributes.getNamedItem("dataSource").value;
        if (!dataSource.includes(" in ")) {
            throw "GUILoader Exception : Malformed XML, Data Source must include an in";
        }
        else {
            var isArray = true;
            var splittedSource = dataSource.split(" in ");
            if (splittedSource.length < 2) {
                throw "GUILoader Exception : Malformed XML, Data Source must an iterator and a source";
            }
            var source = splittedSource[1];
            if (source.startsWith("{") && source.endsWith("}")) {
                isArray = false;
            }
            if (!isArray || (source.startsWith("[") && source.endsWith("]"))) {
                source = source.substring(1, source.length - 1);
            }
            if (this._parentClass) {
                source = this._parentClass[source];
            }
            else {
                source = window[source];
            }
            if (isArray) {
                for (var i = 0; i < source.length; i++) {
                    this._prepareSourceElement(node, guiNode, splittedSource[0], source, i);
                }
            }
            else {
                for (var i in source) {
                    this._prepareSourceElement(node, guiNode, splittedSource[0], source, i);
                }
            }
            if (node.nextSibling) {
                this._parseXml(node.nextSibling, parent);
            }
        }
    };
    GUILoader.prototype._parseXml = function (node, parent, generated) {
        if (generated === void 0) { generated = false; }
        if (node.nodeType != this._nodeTypes.element) {
            if (node.nextSibling) {
                this._parseXml(node.nextSibling, parent, generated);
            }
            return;
        }
        if (generated) {
            node.setAttribute("id", parent.id + parent._children.length + 1);
        }
        var guiNode = this._createGuiElement(node, parent);
        if (node.nodeName == "Grid") {
            this._parseGrid(node, guiNode, parent);
        }
        else if (!node.attributes.getNamedItem("dataSource")) {
            this._parseElement(node, guiNode, parent);
        }
        else {
            this._parseElementsFromSource(node, guiNode, parent);
        }
    };
    /**
     * Gets if the loading has finished.
     * @returns whether the loading has finished or not
    */
    GUILoader.prototype.isLoaded = function () {
        return this._isLoaded;
    };
    /**
     * Gets a loaded node / control by id. .
     * @returns element of type Control
    */
    GUILoader.prototype.getNodeById = function (id) {
        return this._nodes[id];
    };
    /**
     * Gets all loaded nodes / controls
     * @returns Array of controls
    */
    GUILoader.prototype.getNodes = function () {
        return this._nodes;
    };
    /**
     * Initiates the xml layout loading
     * @param xmlFile defines the xml layout to load
     * @param rootNode defines the node / control to use as a parent for the loaded layout controls.
     * @param callback defines the callback called on layout load.
     */
    GUILoader.prototype.loadLayout = function (xmlFile, rootNode, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                if (!xhttp.responseXML) {
                    throw "GUILoader Exception : XML file is malformed or corrupted.";
                }
                var xmlDoc = xhttp.responseXML.documentElement;
                this._parseXml(xmlDoc.firstChild, rootNode);
                this._isLoaded = true;
                if (callback) {
                    callback();
                }
            }
        }.bind(this);
        xhttp.open("GET", xmlFile, true);
        xhttp.send();
    };
    return GUILoader;
}());
