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
