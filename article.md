# Getting Started: Spring Boot Atlassian Connect Framework

## Introducción a Atlassian Connect
Atlassian es la empresa que produce la conocida suite de herramientas para gestión de proyectos y equipos, donde JIRA es su punta de lanza. Desde hace un tiempo, en Atlassian están apostando fuerte por su línea de servicios Cloud, y por una arquitectura más orientada a los microservicios. En este contexto, ha lanzado un framework para el desarrollo de addons para los productos Atlassian: [Atlassian Connect](https://developer.atlassian.com/static/connect/docs/latest/guides/introduction.html).

En pocas palabras, un addon de Atlassian Connect es una aplicación web que se comunica con los productos Cloud de Atlassian según un contrato definido en un "descriptor", añadiendo módulos gráficos y funcionalidades extras a dichos productos. El administrador de la instancia del producto Atlassian (por ej: el adminstrador de JIRA/Confluence) es el encargado de instalar los addons proporcionando la url que dirige al descriptor del addon. A partir de este momento, la instancia y el addon realizan un "handshake" donde se intercambian ciertos datos necesarios para las futuras comunicaciones y la seguridad de las mismas.

Atlassian Connect impone una serie de protocolos de seguridad, basados en [JSON Web Token (JWT)](https://developer.atlassian.com/static/connect/docs/latest/concepts/authentication.html), además de un mecanismo para incorporar nuevos módulos a los productos Atlassian. El desarrollador del addon debe implementar la parte correspondiente de dicho protocolo e indicar en el descriptor los módulos que el addon incorpora. Para facilitar esta tarea, Atlassian ofrece oficialmente dos frameworks, uno para desarrollo en [Node.js y Express.js](https://bitbucket.org/atlassian/atlassian-connect-express), y otro para [Spring Boot (Java)](https://bitbucket.org/atlassian/atlassian-connect-spring-boot/overview). Del primero hay bastante documentación y tutoriales en la web oficial de Atlassian, por lo que en este artículo presentamos un pequeño ejemplo de un desarrollo de un addon usando el framework de Atlassian Connect para Spring Boot.

## Objetivo

El objetivo es desarrollar un pequeño addon, que añada un nuevo panel en la vista de  "ver issue" en JIRA que permita ver, crear, y eliminar una "TODO list" asociada a la issue en cuestión:

![TODO addon][todo-addon]

## Prerequisitos

Tener instalado maven.

## Crear el proyecto
Creamos el proyecto maven con el siguiente comando:
```
mvn archetype:generate -DarchetypeGroupId=com.atlassian.connect
    -DarchetypeArtifactId=atlassian-connect-spring-boot-archetype
    -DarchetypeVersion=1.0.0-beta-3
```
* groupid: io.enmilocalfunciona.atlassian.cloud
* artifactid: todo-addon
* version: 1.0.0
* package: io.enmilocalfunciona.atlassian.cloud

![Create project][create-project]

Confirmamos con 'y'. Este comando de maven nos generará la siguiente estructura:

![Project Structure][project-structure]

## Completamos el descriptor "atlassian-connect.json"

El archivo `atlassian-connect.json` es el descriptor del addon que estamos desarrollando. En el momento de la instalación del mismo en una aplicación cloud Atlassian, es el que indica los módulos que nuestro addon incorporará a la aplicación. En nuestro caso, añadimos un módulo "web panel", de forma que nuestro addon quede de la siguiente manera:

```json
{
  "key": "todo-addon",
  "baseUrl": "${local.server.host}",
  "name": "Atlassian Connect Spring Boot Example",
  "authentication": {
    "type": "jwt"
  },
  "lifecycle": {
    "installed": "/installed",
    "uninstalled": "/uninstalled"
  },
  "scopes": [
        "READ", "WRITE"
   ],
  "modules": {
  	"webPanels": [
  		{
  			"url": "/issue-todos-panel?issueKey={issue.key}",
	        "location": "atl.jira.view.issue.right.context",
	        "weight": 50,
	        "name": {
	          "value": "To do"
	        },
	        "key": "issue-todos-panel"  		
  		}
  	]
  }
}

```
Para cada módulo deberemos indicar una serie de parámetros que dependerá del tipo de módulo. En este caso hemos indicado la `url` que proveerá el contenido HTML del panel, la localización del mismo (`location`), así como su nombre, una clave única y un peso. Más detalle sobre la configuración del módulo "Web Panel" podéis encontrarla [aquí](https://developer.atlassian.com/static/connect/docs/latest/modules/common/web-panel.html).

El campo `baseUrl` tomar valor del parámetro de configuración `local.server.host`, e indica la url pública en la que está alojado nuestro addon. Para ello, añadimos dicho valor en `application.yml`:

```yml
#server host:
local.server.host: https://b7c2cbde.ngrok.io
spring.jpa.hibernate.ddl-auto: update
spring.datasource.url: jdbc:hsqldb:file:addon-db # Use a file-based backing store for HSQL

```
Además, tener en cuenta que esta configuración establece como sistema de persistencia una base de datos HSQL que almacenará los datos en un fichero. Para hacer pruebas esto es OK, pero en un entorno de producción debe configurarse una base de datos real. Aquí tenéis más info sobre cómo  [configurar una base de datos en Spring Boot](http://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-sql.html).

## Creamos la vistas
Para crear las vistas el framework ofrece usar los módulos MVC de Spring-Boot con un middleware que se encarga de realizar la autenticación de forma transparente para el desarrollador. Teniendo en cuenta esto, creamos un controlador `IssueToDosPanelController` para la url definida anteriormente en el descriptor:

```java
package com.enmilocalfunciona.atlassian.cloud.mvc;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.ModelAndView;

import com.atlassian.connect.spring.AtlassianHostUser;

@Controller
public class IssueToDosPanelController {

	@Value("${local.server.host}")
    private String localBaseUrl;

	private Logger log = Logger.getLogger(getClass());

	@RequestMapping(value="/issue-todos-panel", method = RequestMethod.GET)
	public ModelAndView myRest(@AuthenticationPrincipal AtlassianHostUser hostUser,
			HttpServletRequest request) {

	    ModelAndView model = new ModelAndView();
	    model.setViewName("views/issue-todo-panel");

	    model.addObject("localBaseUrl", localBaseUrl);
	    model.addObject("issueKey", request.getParameter("issueKey"));

	    return model;
	}
}
```


Este controlador usa una plantilla velocity "views/issue-todo-panel.vm", creamos dicho archivo en el directorio `src/main/resources/views` con el siguiente contenido:
```html
<html>
    <head>
        <meta charset="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="ap-local-base-url" content="${localBaseUrl}" />
        <title>Todos</title>
        <link rel="stylesheet" href="//aui-cdn.atlassian.com/aui-adg/5.8.12/css/aui.css" media="all" />
        <link rel="stylesheet" href="//aui-cdn.atlassian.com/aui-adg/5.8.12/css/aui-experimental.css" media="all" />
        <!--[if IE 9]><link rel="stylesheet" href="//aui-cdn.atlassian.com/aui-adg/5.8.12/css/aui-ie9.css" media="all"><![endif]-->
        <link rel="stylesheet" href="{{furl '/css/addon.css'}}" type="text/css" />
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
        <script src="https://d3js.org/d3.v3.min.js" charset="utf-8"></script>
        <script src="$localBaseUrl/js/todo-panel.js" type="text/javascript"></script>
        <script src="${atlassian-connect-all-js-url}" type="text/javascript"></script>
    </head>
    <body>
        <div>
        	<input class="hidden" id="todos-issue-key" value="$issueKey"></input>
        	<div id="todo-list">
        	</div>
        	<div class="field-group">
	        	<input class="text medium-field" type="text" name="description" id="description-input"></input>
	        	<button class="aui-button" value="create" id="create-button"> Create </button>
        	</div>
        </div>
    </body>
</html>
```
Además, como véis la vista carga un script de Javascript "js/todo-panel.js" que es el que proporcionará funcionalidad a nuestro panel y realizará peticiones a la API de JIRA para almacenar propiedades en las issues. Este archivo lo creamos en también la carpeta `src/main/resources`, dentro de un subdirectorio `public`:

```javascript
/* add-on script */
// Addon functionality

// Elimina un "todo" de la issue
function removeTodo(todo){

    var issueId = getIssueKey();
    var data = getData();
    var index = data.indexOf(todo);
    data.splice(index,1)
    var newData = { todos: data};
    AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function() {
            	refreshTodoPanel();
            },
            data: JSON.stringify(newData),
            type: "PUT",
            error: function(response) {
                console.error("Error loading API" + response);
            },
            contentType: "application/json"
        });
    });
}

// Crea un 'to do' en la issue
function createTodo(){
	// Obtenemos la descripción a partir del input:
	var todo = $('#description-input').val();
	$('#description-input').val("");

	// Obtenemos la 'issue key'
    var issueId = getIssueKey();
    // obtenemos los "todo" actuales y metemos uno nuevo
    var data = getData();
    var newData = { todos: data }
    newData.todos.push(todo);

    // hacemos la petición a la API rest de JIRA
    AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function() {
            	refreshTodoPanel();
            },
            error: function() {
                console.error("Error loading API" + response.status);
            },
            data: JSON.stringify(newData),
            type: "PUT",
            contentType: "application/json"
        });
    });  
}

// Inicializamos el panel
$(function(){
    $('#create-button').click(createTodo);
    refreshTodoPanel();
});

// Obtiene los todos y genera dinámicamente la tabla con los mismos
function refreshTodoPanel(){
	var issueId = getIssueKey();
	AP.require(['request'], function(request) {
        request({
            url: '/rest/api/2/issue/'+issueId+'/properties/todos',
            success: function(response) {
            	// Convierte la respuesta a JSON
                response = JSON.parse(response);

                // Llamamos a una función auxiliar para construir la tabla
                buildTodoTable(response.value.todos, "#todo-list");
            },
            error: function() {
                buildTodoTable([], "#todo-list");
            },
            contentType: "application/json"
        });
    });
}

// Crea una tabla con los todos dentro del elemento identificado por
// el selector pasado en el parámetro
function buildTodoTable(todos, selector) {

    function buildTableAndReturnTbody(hostElement) {
        var projTable = hostElement.append('table')
            .classed({'aui': true});

        // table > thead > tr
        var projHeadRow = projTable.append("thead").append("tr");
        // añadimos cabeceras a la tabla
        projHeadRow.append("th").text("Description");
        projHeadRow.append("th").text("Action");

        return projTable.append("tbody");
    }

    var rootElement = d3.select(selector);
    rootElement.html("");
    var tableBody = buildTableAndReturnTbody(rootElement);

    if (!todos.length){
    	tableBody
    		.append("div")
    		.append('span')
    		.classed({'aui-lozenge': true, 'aui-lozenge-success': true})
    		.text("No todos for this issue")
    	return;
    }

    // por cada uno de los todos:
    var row = tableBody.selectAll("tr")
        .data(todos)
        .enter()
        .append("tr");

    // Añadimos un td para la descripción
    row.append("td").append('span')
        .classed({'aui-label': true})
        // el contenido del td será el propio todo
        .text(function(item) { return item; });

    // Finalmente, un td con el 'enlace' de elminar
    row.append("td").append('span')

        .append("a")

        .attr('href', "#")
        .text("remove")
        //personalizaremos el evento 'click'
        .on("click", function (d){
        	removeTodo(d);
        });
}

// obtiene los todos cargados en la tabla html
function getData(){
	return d3.select('#todo-list tbody').selectAll("tr").data();
}

// obtenemos la issuekey que hemos almacenando en un input oculto, a modo de metadato
function getIssueKey(){
	return $('#todos-issue-key').val();
}
```
¡Y con esto ya tenemos nuestro addon completo! La estructura completa del proyecto debe ser algo así:

![Project Structure][project-structure-all]

¡Vamos a probarlo!

## Probando el addon en un entorno cloud
Para probar el desarrollo necesitamos primero un entorno JIRA Cloud para desarrollo. Las instrucciones para conseguir uno puedes seguirlas [aquí](https://developer.atlassian.com/static/connect/docs/latest/guides/development-setup.html#cloud-dev).

Lo siguiente es hacer público nuestro addon en la web, para ello usaremos una herramienta que crea proxies y túneles a nuestro PC local: [ngrok](https://ngrok.com/download). Puedes instalarla con `npm install -g ngrok`, o descargarla de su web.

Por defecto nuesta aplicación corre en puerto 8080, por lo que creamos el proxy a ese puerto:
```
ngrok http 8080
```

Cogemos la url HTTPS y es la que sustituiremos en el archivo de configuración, en mi caso el archivo queda de la siguiente manera:
```yml
#server host:
local.server.host: https://b7c2cbde.ngrok.io
spring.jpa.hibernate.ddl-auto: update
spring.datasource.url: jdbc:hsqldb:file:addon-db # Use a file-based backing store for HSQL
```

Ya sólo nos queda arrancar la aplicación de Spring-Boot
```
mvn spring-boot:run
```
y comprobar en el navegador que está accesible publicamente:
![Atlassian Connect Json][check-app-running]

### Instalando el addon
Tras acceder a la instancia cloud de JIRA para desarrollo, nos dirigimos a la ventana de administración de addons (en la esquina superior derecha, click en el icono de la 'tuerca' y luego click en 'Addons' en el desplegable que aparece. Una vez cargada la página, hacemos click en 'Manage Addons' en el menú de la izquierda). En esta ventana hacemos click en "Upload add-on", e introducimos la url de nuestro addon:
![Upload addon][upload-addon]

Y si vamos a la vista de una issue, ya podemos ver nuestro panel en el que podemos ver, crear y eliminar "to-do's":

![TODO addon][todo-addon]




[create-project]: ./images/create-project.png "Create project"
[project-structure]: ./images/project-structure.png "Project structure"
[project-structure-all]: ./images/project-structure-all.png "Project structure"
[check-app-running]: ./images/ngrokio_atlassian-connect.json.png "Atlassian connect json"
[upload-addon]: ./images/upload.png "Atlassian connect json"
[todo-addon]: ./images/todo-addon.png "Atlassian connect json"
