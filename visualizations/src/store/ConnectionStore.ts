import {VuexModule, Module, Mutation, Action} from 'vuex-module-decorators';
import { Module as Modx } from 'vuex';
import QlogConnectionGroup from "@/data/ConnectionGroup";
import QlogConnection from '@/data/Connection';
import QlogEvent from '@/data/Event';

import * as qlog from '@quictools/qlog-schema'; 
import { QUtil } from '@quictools/qlog-schema/util'; 
// import * as qlog from '/home/rmarx/WORK/QUICLOG/qlog-schema/trunk/TypeScript' 
// import { QUtil } from '/home/rmarx/WORK/QUICLOG/qlog-schema/trunk/TypeScript/util'; 

@Module({name: 'connections'})
export default class ConnectionStore extends VuexModule {

    protected grouplist:Array<QlogConnectionGroup> = new Array<QlogConnectionGroup>();
    protected dummyConnection!:QlogConnection;

    public constructor(moduler: Modx<ThisType<{}>, any>){
        super(moduler); 
        this.dummyConnection = this.createDummyConnection();
    }

    get groups(): Array<QlogConnectionGroup> {
        return this.grouplist;
    }

    @Mutation
    public AddGroup(group:QlogConnectionGroup) {
        console.log("ConnectionStore Mutation for adding group", group);
        this.grouplist.push(group);
    }

    @Mutation
    public DeleteGroup(group:QlogConnectionGroup) {
        const index = this.grouplist.indexOf(group);

        if ( index !== -1 ) {
            this.grouplist.splice(index, 1);
        }
    }

    @Action
    // TODO: move this away from here to its own location
    // We need to prepare ways to load QLOG files of various qlog versions and then map them to our internal structs
    // A way to do this is having converters, e.g., Draft17Loader, Draft18Loader etc. that get the fileContents 
    // and that then transform them to our internal classes
    // Downside: we need internal classes for everything...
    // However: if we just always use the latest versions or a single specified version from the @quictools/qlog-schema package,
    // we can just use that internally and convert the rest to that and update when needed
    // Potentially bigger problem: checking if json adheres to the TypeScript spec... 
    // this could be done with something like https://github.com/typestack/class-transformer
    // but then we would need to add additional annotations to the Schema classes... urgh
    public async AddGroupFromQlogFile( { fileContents, filename } : { fileContents:qlog.IQLog, filename:string } ){
        console.log("AddGroupFromQlogFile", fileContents, fileContents.connectionid);

        // current QLog files don't yet have the concept of the grouping, 
        // so what we get in is actually what we would call a QlogConnection instead of a Group
        const group = new QlogConnectionGroup();
        group.description = filename;
        group.title = filename;

        const connection = new QlogConnection(group);
        connection.name = fileContents.vantagepoint;
        const wrap = QUtil.WrapEvent(null);

        for ( const jsonevt of fileContents.events ){
            wrap.evt = jsonevt;

            const evt2:QlogEvent = new QlogEvent();
            evt2.time       = wrap.time;
            evt2.category   = wrap.category; 
            evt2.name       = wrap.type;
            evt2.trigger    = wrap.trigger;
            evt2.data       = wrap.data;

            connection.AddEvent(evt2);
        }

        this.context.commit( "AddGroup", group );
    }

    @Action({commit: 'AddGroup'})
    public async DEBUG_LoadRandomFile(filename:string) {
        const testGroup = new QlogConnectionGroup();
        testGroup.description = filename;

        const connectionCount = Math.round(Math.random() * 5) + 1;
        for ( let i = 0; i < connectionCount; ++i ){
            const connectionTest = new QlogConnection(testGroup);
            connectionTest.name = "Connection " + i;

            const eventCount = Math.ceil(Math.random() * 3);
            for ( let j = 0; j < eventCount; ++j ){
                const eventTest = new QlogEvent();
                eventTest.name = "Connection #" + i + " - Event #" + j;
                connectionTest.AddEvent( eventTest );
            }
        }

        return testGroup;
    }
    
    protected createDummyConnection() : QlogConnection{

        // We need a way to represent an empty connection in the UI
        // We can do this with a null-value but that requires us to check for NULL everywhere...
        // We chose the option of providing an empty dummy connection instead, that has no events and minimal other metadata

        const dummyGroup:QlogConnectionGroup = new QlogConnectionGroup();
        dummyGroup.description = "None";
        dummyGroup.title = "None";

        const output:QlogConnection = new QlogConnection(dummyGroup);
        output.name = "None";

        this.grouplist.push( dummyGroup ); 

        return output;
    }
}
